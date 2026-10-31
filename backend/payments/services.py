import hashlib
import hmac
import json
import logging
from decimal import ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import APIException, NotFound, ValidationError
from cart.services import remove_ordered_items_from_cart
from notifications.models import Notification
from notifications.services import notify
from orders.models import Order, OrderStatus, OrderStatusHistory, PaymentMethod, PaymentStatus

from .models import Payment, PaymentRecordStatus, WebhookEvent

log = logging.getLogger(__name__)


class GatewayError(APIException):
    status_code = 502
    default_detail = "The payment gateway could not be reached. Please try again."


class GatewayNotConfigured(APIException):
    status_code = 503
    default_detail = "Online payments are not configured on the server."


def to_paise(amount):
    return int((amount * 100).to_integral_value(rounding=ROUND_HALF_UP))


def razorpay_client():
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        raise GatewayNotConfigured()
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _hmac_hex(secret, message):
    return hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()


def verify_checkout_signature(razorpay_order_id, razorpay_payment_id, signature):
    """Razorpay checkout signature = HMAC_SHA256(order_id + '|' + payment_id, key_secret)."""
    if not settings.RAZORPAY_KEY_SECRET or not signature:
        return False
    expected = _hmac_hex(settings.RAZORPAY_KEY_SECRET, f"{razorpay_order_id}|{razorpay_payment_id}".encode())
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature):
    """Webhook signature = HMAC_SHA256(raw request body, webhook_secret)."""
    if not settings.RAZORPAY_WEBHOOK_SECRET or not signature:
        return False
    return hmac.compare_digest(_hmac_hex(settings.RAZORPAY_WEBHOOK_SECRET, body), signature)


# ---------------------------------------------------------------- create
@transaction.atomic
def create_payment_order(user, order_id):
    order = Order.objects.select_for_update().filter(pk=order_id, user=user).first()
    if not order:
        raise NotFound("Order not found.")
    if order.payment_method != PaymentMethod.RAZORPAY:
        raise ValidationError({"detail": "This order is not an online-payment order."})
    if order.status != OrderStatus.PENDING_PAYMENT:
        raise ValidationError({"detail": "This order is not awaiting payment."})

    # Retry: reuse the same Razorpay order (Razorpay allows several attempts on one order).
    payment = (
        Payment.objects.select_for_update()
        .filter(order=order, razorpay_order_id__isnull=False, amount=order.total_amount)
        .exclude(status=PaymentRecordStatus.SUCCESS).first()
    )
    if not payment:
        try:
            rp_order = razorpay_client().order.create({
                "amount": to_paise(order.total_amount), "currency": "INR", "receipt": order.order_number,
                "payment_capture": 1, "notes": {"order_id": str(order.pk), "order_number": order.order_number},
            })
        except GatewayNotConfigured:
            raise
        except Exception:
            log.exception("Razorpay order creation failed")
            raise GatewayError()
        payment = Payment.objects.create(
            order=order, method=PaymentMethod.RAZORPAY, amount=order.total_amount, currency="INR",
            razorpay_order_id=rp_order["id"],
        )
    elif payment.status != PaymentRecordStatus.CREATED:
        payment.status = PaymentRecordStatus.CREATED
        payment.failure_reason = ""
        payment.save(update_fields=["status", "failure_reason", "updated_at"])
    if order.payment_status != PaymentStatus.PENDING:
        order.payment_status = PaymentStatus.PENDING
        order.save(update_fields=["payment_status", "updated_at"])

    return {
        "key_id": settings.RAZORPAY_KEY_ID,  # public key id only; the secret never leaves the server
        "razorpay_order_id": payment.razorpay_order_id,
        "amount": to_paise(order.total_amount), "currency": "INR",
        "order_id": order.pk, "order_number": order.order_number,
        "name": "Shop", "description": f"Order {order.order_number}",
        "prefill": {"name": user.first_name, "email": user.email, "contact": user.phone},
    }


# ---------------------------------------------------------------- state changes (caller holds the payment lock)
def _lock_order(payment):
    return Order.objects.select_for_update().get(pk=payment.order_id)


def mark_success(payment, gateway_payment_id, signature="", instrument=""):
    """Idempotent. Returns True only the first time it actually changes state."""
    if payment.status == PaymentRecordStatus.SUCCESS:
        if payment.razorpay_payment_id != gateway_payment_id:
            log.warning("Second payment %s captured for already-paid payment %s - needs manual refund", gateway_payment_id, payment.pk)
        return False
    payment.status = PaymentRecordStatus.SUCCESS
    payment.razorpay_payment_id = gateway_payment_id
    payment.razorpay_signature = signature
    payment.transaction_reference = gateway_payment_id
    payment.instrument = instrument or payment.instrument
    payment.failure_reason = ""
    payment.save()

    order = _lock_order(payment)
    if order.status == OrderStatus.CANCELLED:
        # Money arrived after the order was cancelled/expired: keep the order cancelled, flag for refund.
        order.payment_status = PaymentStatus.REFUND_PENDING
        order.save(update_fields=["payment_status", "updated_at"])
        notify(order.user, "Payment received for a cancelled order",
               f"Your payment for {order.order_number} will be refunded.", Notification.PAYMENT, order)
        return True
    order.payment_status = PaymentStatus.PAID
    fields = ["payment_status", "updated_at"]
    if order.status == OrderStatus.PENDING_PAYMENT:
        order.status = OrderStatus.PLACED
        fields.append("status")
        OrderStatusHistory.objects.create(order=order, status=OrderStatus.PLACED, note="Payment confirmed")
    order.save(update_fields=fields)
    remove_ordered_items_from_cart(order)
    notify(order.user, "Payment successful", f"We received your payment for order {order.order_number}.", Notification.PAYMENT, order)
    notify(order.user, "Order placed", f"Your order {order.order_number} has been placed.", Notification.ORDER, order)
    return True


def mark_failed(payment, reason="Payment failed", status=PaymentRecordStatus.FAILED):
    if payment.status == PaymentRecordStatus.SUCCESS:
        return False  # never downgrade a confirmed payment
    payment.status = status
    payment.failure_reason = reason[:255]
    payment.save(update_fields=["status", "failure_reason", "updated_at"])
    order = _lock_order(payment)
    if order.payment_status == PaymentStatus.PENDING and status == PaymentRecordStatus.FAILED:
        order.payment_status = PaymentStatus.FAILED
        order.save(update_fields=["payment_status", "updated_at"])
        notify(order.user, "Payment failed", f"Payment for order {order.order_number} failed. You can retry.", Notification.PAYMENT, order)
    return True


def apply_gateway_payment(payment, gp, signature=""):
    """Apply a Razorpay payment entity (fetched from the API, or from a signed webhook) to our records.
    Validates order id, amount and currency first. Returns 'success' | 'failed' | 'pending'."""
    if gp.get("order_id") != payment.razorpay_order_id:
        raise ValidationError({"detail": "Payment does not belong to this order."})
    if gp.get("amount") != to_paise(payment.amount) or gp.get("currency", "INR") != payment.currency:
        log.error("Amount mismatch on payment %s: gateway=%s expected=%s", payment.pk, gp.get("amount"), to_paise(payment.amount))
        raise ValidationError({"detail": "Payment amount does not match the order total."})
    state = gp.get("status")
    if state == "captured":
        mark_success(payment, gp["id"], signature, gp.get("method", ""))
        return "success"
    if state == "failed":
        mark_failed(payment, gp.get("error_description") or "Payment failed")
        return "failed"
    return "pending"


# ---------------------------------------------------------------- verify (called by the app after checkout)
def verify_payment(user, razorpay_order_id, razorpay_payment_id, razorpay_signature):
    if not verify_checkout_signature(razorpay_order_id, razorpay_payment_id, razorpay_signature):
        raise ValidationError({"detail": "Invalid payment signature."})
    with transaction.atomic():
        payment = (
            Payment.objects.select_for_update().select_related("order")
            .filter(razorpay_order_id=razorpay_order_id, order__user=user).first()
        )
        if not payment:
            raise NotFound("Payment not found.")
        if payment.status == PaymentRecordStatus.SUCCESS:
            return payment, "success"  # duplicate callback
        try:
            gp = razorpay_client().payment.fetch(razorpay_payment_id)  # amount/status come from Razorpay, not the client
        except GatewayNotConfigured:
            raise
        except Exception:
            log.exception("Razorpay payment fetch failed")
            raise GatewayError()
        outcome = apply_gateway_payment(payment, gp, razorpay_signature)
    payment.refresh_from_db()
    return payment, outcome


@transaction.atomic
def report_client_event(user, razorpay_order_id, outcome, reason=""):
    """The app tells us the customer closed checkout / saw a failure. Informational only:
    it can mark a still-open attempt cancelled/failed but can NEVER mark anything paid."""
    payment = Payment.objects.select_for_update().filter(razorpay_order_id=razorpay_order_id, order__user=user).first()
    if not payment:
        raise NotFound("Payment not found.")
    if payment.status == PaymentRecordStatus.CREATED:
        if outcome == "cancelled":
            mark_failed(payment, "Cancelled by customer", PaymentRecordStatus.CANCELLED)
        else:
            mark_failed(payment, reason or "Payment failed")
    return payment


# ---------------------------------------------------------------- webhook
def handle_webhook(raw_body: bytes, signature, event_id):
    """Returns a short result string. Raises PermissionError on a bad signature."""
    if not verify_webhook_signature(raw_body, signature):
        raise PermissionError("bad signature")
    event = json.loads(raw_body)
    event_id = event_id or hashlib.sha256(raw_body).hexdigest()
    with transaction.atomic():
        record, created = WebhookEvent.objects.get_or_create(
            event_id=event_id, defaults={"event": event.get("event", ""), "payload": event})
        if not created and record.processed:
            return "duplicate"
        entity = (event.get("payload", {}).get("payment") or {}).get("entity")
        note = "ignored"
        if entity and entity.get("order_id") and event.get("event") in ("payment.captured", "order.paid", "payment.failed"):
            payment = Payment.objects.select_for_update().filter(razorpay_order_id=entity["order_id"]).first()
            if not payment:
                note = "unknown order"
            else:
                try:
                    note = apply_gateway_payment(payment, entity)
                except ValidationError as exc:  # mismatch: record it, return 200 so Razorpay stops retrying
                    note = f"rejected: {exc.detail}"[:255]
        record.processed, record.note = True, note
        record.save(update_fields=["processed", "note"])
    return note


# ---------------------------------------------------------------- refunds (admin action)
def refund_order(order):
    """Refund the successful Razorpay payment of an order in full. Returns a message string."""
    payment = order.payments.filter(status=PaymentRecordStatus.SUCCESS, razorpay_payment_id__isnull=False).first()
    if not payment or order.payment_status != PaymentStatus.REFUND_PENDING:
        raise ValidationError("Order has no refund pending.")
    try:
        razorpay_client().payment.refund(payment.razorpay_payment_id, {"amount": to_paise(payment.amount)})
    except Exception as exc:
        log.exception("Refund failed")
        raise GatewayError(f"Refund failed: {exc}")
    order.payment_status = PaymentStatus.REFUNDED
    order.save(update_fields=["payment_status", "updated_at"])
    notify(order.user, "Refund initiated", f"Your refund for order {order.order_number} has been initiated.", Notification.PAYMENT, order)
    return f"Refund initiated for {order.order_number}."
