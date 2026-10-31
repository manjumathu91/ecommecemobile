

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from addresses.models import Address
from cart.services import get_cart, remove_ordered_items_from_cart
from coupons.models import Coupon
from coupons.services import validate_coupon
from notifications.models import Notification
from notifications.services import notify
from products.models import Product

from .inventory import log_stock
from .models import (
    CANCELLABLE,
    FLOW,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    PaymentMethod,
    PaymentStatus,
    TaxType,
)


CENT = Decimal("0.01")
HUNDRED = Decimal("100")


def _money(value):
    """Round a monetary value to two decimal places."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def delivery_charge_for(amount):
    amount = _money(amount)
    return (
        Decimal("0.00")
        if amount >= settings.FREE_DELIVERY_THRESHOLD
        else _money(settings.DELIVERY_CHARGE)
    )


def _cart_lines(user, lock):
    """Validate cart products and live stock."""
    cart_items = list(get_cart(user).items.all())

    if not cart_items:
        raise ValidationError({"cart": "Your cart is empty."})

    qs = Product.objects.filter(
        id__in=[item.product_id for item in cart_items]
    ).order_by("id")

    products = {
        product.id: product
        for product in (qs.select_for_update() if lock else qs)
    }

    lines = []

    for item in cart_items:
        product = products.get(item.product_id)

        if product is None or not product.is_active:
            raise ValidationError({
                "cart": "A product in your cart is no longer available."
            })

        if item.quantity > product.stock:
            raise ValidationError({
                "cart": (
                    f"Only {product.stock} unit(s) of "
                    f"'{product.name}' left in stock."
                )
            })

        lines.append((product, item.quantity))

    return lines


def _allocate_amount(total, weights):
    """
    Allocate a monetary amount proportionally.
    The final line receives the rounding remainder so allocations
    always add up exactly to the original amount.
    """
    total = _money(total)

    if not weights:
        return []

    total_weight = sum(weights, Decimal("0"))

    if total_weight <= 0:
        if total == 0:
            return [Decimal("0.00") for _ in weights]

        raise ValidationError({
            "cart": "Unable to distribute the order discount or delivery fee."
        })

    allocations = []
    allocated = Decimal("0.00")

    for index, weight in enumerate(weights):
        if index == len(weights) - 1:
            value = _money(total - allocated)
        else:
            value = _money(total * weight / total_weight)
            allocated += value

        allocations.append(value)

    return allocations


def _tax_type_for_state(state):
    """VELORA is registered in Tamil Nadu."""
    normalized = (state or "").strip().casefold()
    normalized = " ".join(normalized.replace(".", "").split())

    if not normalized:
        raise ValidationError({
            "address": "The delivery address must contain a state."
        })

    tamil_nadu_names = {
        "tamil nadu",
        "tamilnadu",
        "tn",
    }

    return (
        TaxType.INTRA_STATE
        if normalized in tamil_nadu_names
        else TaxType.INTER_STATE
    )


def _totals(lines, user, coupon_code, lock, delivery_state=None):
    """
    Calculate product discount, coupon discount, delivery allocation,
    taxable value and GST for every cart line.

    Product prices are GST-exclusive.
    """

    if not lines:
        raise ValidationError({"cart": "Your cart is empty."})

    original_items_total = _money(sum(
        (product.price * quantity for product, quantity in lines),
        Decimal("0.00"),
    ))

    line_amounts = [
        _money(product.effective_price * quantity)
        for product, quantity in lines
    ]

    items_total = _money(sum(line_amounts, Decimal("0.00")))
    product_discount = _money(original_items_total - items_total)

    coupon = None
    coupon_discount = Decimal("0.00")

    if coupon_code:
        coupon, coupon_discount = validate_coupon(
            coupon_code,
            user,
            items_total,
            lock=lock,
        )
        coupon_discount = _money(coupon_discount)

    if coupon_discount < 0 or coupon_discount > items_total:
        raise ValidationError({
            "coupon": "The calculated coupon discount is invalid."
        })

    delivery = delivery_charge_for(items_total - coupon_discount)

    # Allocate coupon discount proportionally across product lines.
    coupon_allocations = _allocate_amount(
        coupon_discount,
        line_amounts,
    )

    discounted_line_amounts = [
        _money(line_amount - coupon_share)
        for line_amount, coupon_share in zip(
            line_amounts,
            coupon_allocations,
        )
    ]

    # Delivery is included in the taxable value and allocated across
    # the discounted product lines.
    delivery_weights = discounted_line_amounts

    if sum(delivery_weights, Decimal("0")) <= 0:
        delivery_weights = line_amounts

    delivery_allocations = _allocate_amount(
        delivery,
        delivery_weights,
    )

    tax_type = (
        _tax_type_for_state(delivery_state)
        if delivery_state is not None
        else None
    )

    item_tax_details = []

    taxable_amount = Decimal("0.00")
    gst_amount = Decimal("0.00")
    cgst_amount = Decimal("0.00")
    sgst_amount = Decimal("0.00")
    igst_amount = Decimal("0.00")

    for index, (product, quantity) in enumerate(lines):
        if product.gst_rate is None:
            raise ValidationError({
                "gst": (
                    f"GST rate is missing for '{product.name}'. "
                    "Update its GST rate in Django Admin before checkout."
                )
            })

        gst_rate = Decimal(product.gst_rate)

        if gst_rate < 0 or gst_rate > 100:
            raise ValidationError({
                "gst": f"Invalid GST rate configured for '{product.name}'."
            })

        taxable_value = _money(
            discounted_line_amounts[index]
            + delivery_allocations[index]
        )

        line_gst = _money(taxable_value * gst_rate / HUNDRED)

        line_cgst = Decimal("0.00")
        line_sgst = Decimal("0.00")
        line_igst = Decimal("0.00")

        if tax_type == TaxType.INTRA_STATE:
            # Split the rounded GST amount, ensuring both components
            # add up exactly to the line GST amount.
            line_cgst = _money(line_gst / Decimal("2"))
            line_sgst = _money(line_gst - line_cgst)

        elif tax_type == TaxType.INTER_STATE:
            line_igst = line_gst

        taxable_amount += taxable_value
        gst_amount += line_gst
        cgst_amount += line_cgst
        sgst_amount += line_sgst
        igst_amount += line_igst

        item_tax_details.append({
            "product": product,
            "quantity": quantity,
            "line_amount": line_amounts[index],
            "product_discount": _money(
                (product.price * quantity) - line_amounts[index]
            ),
            "coupon_discount": coupon_allocations[index],
            "delivery_allocation": delivery_allocations[index],
            "taxable_value": taxable_value,
            "hsn_code": product.hsn_code or "",
            "gst_rate": gst_rate,
            "gst_amount": line_gst,
            "cgst_amount": line_cgst,
            "sgst_amount": line_sgst,
            "igst_amount": line_igst,
        })

    taxable_amount = _money(taxable_amount)
    gst_amount = _money(gst_amount)
    cgst_amount = _money(cgst_amount)
    sgst_amount = _money(sgst_amount)
    igst_amount = _money(igst_amount)

    total_amount = _money(taxable_amount + gst_amount)

    return {
        "original_items_total": original_items_total,
        "items_total": items_total,
        "product_discount": product_discount,
        "coupon": coupon,
        "coupon_discount": coupon_discount,
        "delivery_charge": delivery,
        "taxable_amount": taxable_amount,
        "gst_amount": gst_amount,
        "cgst_amount": cgst_amount,
        "sgst_amount": sgst_amount,
        "igst_amount": igst_amount,
        "tax_type": tax_type,
        "total_amount": total_amount,
        "item_tax_details": item_tax_details,
    }


def checkout_summary(user, coupon_code=None, address_id=None):
    """
    Calculate checkout preview.

    Pass address_id to receive the correct CGST/SGST or IGST breakdown.
    Without an address, the overall GST amount is still calculated,
    but the state-wise tax split is left unspecified.
    """
    lines = _cart_lines(user, lock=False)

    delivery_state = None

    if address_id:
        address = Address.objects.filter(
            user=user,
            pk=address_id,
        ).first()

        if not address:
            raise ValidationError({
                "address_id": "Select a valid delivery address."
            })

        delivery_state = address.state

    totals = _totals(
        lines,
        user,
        coupon_code,
        lock=False,
        delivery_state=delivery_state,
    )

    return {
        "original_items_total": totals["original_items_total"],
        "items_total": totals["items_total"],
        "product_discount": totals["product_discount"],
        "coupon_code": (
            totals["coupon"].code if totals["coupon"] else ""
        ),
        "coupon_discount": totals["coupon_discount"],
        "delivery_charge": totals["delivery_charge"],
        "taxable_amount": totals["taxable_amount"],
        "gst_amount": totals["gst_amount"],
        "cgst_amount": totals["cgst_amount"],
        "sgst_amount": totals["sgst_amount"],
        "igst_amount": totals["igst_amount"],
        "tax_type": totals["tax_type"],
        "total_amount": totals["total_amount"],
        "item_count": sum(quantity for _, quantity in lines),
    }


def _record(order, status, note="", by=None):
    OrderStatusHistory.objects.create(
        order=order,
        status=status,
        note=note,
        changed_by=by,
    )


@transaction.atomic
def place_order(user, address_id, payment_method, coupon_code=None):
    lines = _cart_lines(user, lock=True)

    address = Address.objects.filter(
        user=user,
        pk=address_id,
    ).first()

    if not address:
        raise ValidationError({
            "address_id": "Select a valid delivery address."
        })

    totals = _totals(
        lines,
        user,
        coupon_code,
        lock=True,
        delivery_state=address.state,
    )

    cod = payment_method == PaymentMethod.COD

    order = Order.objects.create(
        user=user,
        status=(
            OrderStatus.PLACED
            if cod
            else OrderStatus.PENDING_PAYMENT
        ),
        payment_method=payment_method,
        payment_status=PaymentStatus.PENDING,
        address=address,
        shipping_name=address.full_name,
        shipping_phone=address.phone,
        shipping_address=", ".join(filter(None, [
            address.house_number,
            address.street,
            address.city,
            address.state,
            address.postal_code,
            (
                f"Note: {address.delivery_instructions}"
                if address.delivery_instructions
                else ""
            ),
        ])),

        items_total=totals["items_total"],
        original_items_total=totals["original_items_total"],
        product_discount=totals["product_discount"],

        coupon=totals["coupon"],
        coupon_code=(
            totals["coupon"].code if totals["coupon"] else ""
        ),
        coupon_discount=totals["coupon_discount"],

        delivery_charge=totals["delivery_charge"],
        taxable_amount=totals["taxable_amount"],
        gst_amount=totals["gst_amount"],
        cgst_amount=totals["cgst_amount"],
        sgst_amount=totals["sgst_amount"],
        igst_amount=totals["igst_amount"],
        tax_type=totals["tax_type"],

        total_amount=totals["total_amount"],
        estimated_delivery=(
            timezone.localdate()
            + timedelta(days=settings.ESTIMATED_DELIVERY_DAYS)
        ),
    )

    for detail in totals["item_tax_details"]:
        product = detail["product"]
        quantity = detail["quantity"]

        OrderItem.objects.create(
            order=order,
            product=product,
            product_name=product.name,
            original_price=product.price,
            unit_price=product.effective_price,
            quantity=quantity,
            line_total=detail["line_amount"],

            # Snapshot GST information at order time.
            hsn_code=detail["hsn_code"],
            gst_rate=detail["gst_rate"],
            product_discount=detail["product_discount"],
            coupon_discount=detail["coupon_discount"],
            taxable_value=detail["taxable_value"],
            gst_amount=detail["gst_amount"],
            cgst_amount=detail["cgst_amount"],
            sgst_amount=detail["sgst_amount"],
            igst_amount=detail["igst_amount"],
        )

        product.stock -= quantity
        product.sold_count += quantity
        product.save(update_fields=[
            "stock",
            "sold_count",
            "updated_at",
        ])

        log_stock(product, -quantity, "Order placed", order)

    if totals["coupon"]:
        Coupon.objects.filter(
            pk=totals["coupon"].pk
        ).update(used_count=F("used_count") + 1)

    if cod:
        from payments.models import Payment, PaymentRecordStatus

        Payment.objects.create(
            order=order,
            method=PaymentMethod.COD,
            amount=totals["total_amount"],
            status=PaymentRecordStatus.CREATED,
        )

        _record(
            order,
            OrderStatus.PLACED,
            "Order placed (cash on delivery)",
        )

        notify(
            user,
            "Order placed",
            f"Your order {order.order_number} has been placed.",
            Notification.ORDER,
            order,
        )

        remove_ordered_items_from_cart(order)

    else:
        _record(
            order,
            OrderStatus.PENDING_PAYMENT,
            "Awaiting online payment",
        )

    return order


def restock(order, reason):
    """Return stock for every line of an order."""
    items = list(
        order.items.exclude(product=None).order_by("product_id")
    )

    products = {
        product.id: product
        for product in Product.objects.select_for_update()
        .filter(id__in=[item.product_id for item in items])
        .order_by("id")
    }

    for item in items:
        product = products[item.product_id]

        product.stock += item.quantity
        product.sold_count = max(
            0,
            product.sold_count - item.quantity,
        )

        product.save(update_fields=[
            "stock",
            "sold_count",
            "updated_at",
        ])

        log_stock(product, item.quantity, reason, order)


@transaction.atomic
def cancel_order(
    order_id,
    user=None,
    note="Cancelled by customer",
    by=None,
):
    qs = Order.objects.select_for_update()

    if user is not None:
        qs = qs.filter(user=user)

    order = qs.filter(pk=order_id).first()

    if not order:
        raise NotFound("Order not found.")

    if order.status not in CANCELLABLE:
        raise ValidationError({
            "detail": (
                f"An order that is '{order.get_status_display()}' "
                "can no longer be cancelled."
            )
        })

    restock(order, "Order cancelled")

    if order.coupon_id:
        Coupon.objects.filter(
            pk=order.coupon_id,
            used_count__gt=0,
        ).update(used_count=F("used_count") - 1)

    if order.payment_status == PaymentStatus.PAID:
        order.payment_status = PaymentStatus.REFUND_PENDING

    from payments.models import Payment, PaymentRecordStatus

    Payment.objects.filter(
        order=order,
        status=PaymentRecordStatus.CREATED,
    ).update(status=PaymentRecordStatus.CANCELLED)

    order.status = OrderStatus.CANCELLED

    order.save(update_fields=[
        "status",
        "payment_status",
        "updated_at",
    ])

    _record(order, OrderStatus.CANCELLED, note, by)

    message = f"Your order {order.order_number} was cancelled."

    if order.payment_status == PaymentStatus.REFUND_PENDING:
        message += " Your refund will be processed."

    notify(
        order.user,
        "Order cancelled",
        message,
        Notification.ORDER,
        order,
    )

    return order


_STATUS_MESSAGES = {
    OrderStatus.CONFIRMED: ("Order confirmed", Notification.ORDER),
    OrderStatus.PROCESSING: ("Order is being processed", Notification.ORDER),
    OrderStatus.SHIPPED: ("Order shipped", Notification.SHIPPING),
    OrderStatus.OUT_FOR_DELIVERY: (
        "Out for delivery",
        Notification.SHIPPING,
    ),
    OrderStatus.DELIVERED: ("Order delivered", Notification.DELIVERY),
}


@transaction.atomic
def advance_status(order_id, new_status, by=None, note=""):
    """Admin-driven forward transition through the delivery flow."""
    order = Order.objects.select_for_update().get(pk=order_id)

    if new_status not in FLOW:
        raise ValidationError({"status": "Invalid target status."})

    if order.status not in FLOW:
        raise ValidationError({
            "status": (
                f"A '{order.get_status_display()}' order "
                "cannot be advanced."
            )
        })

    if FLOW.index(new_status) <= FLOW.index(order.status):
        raise ValidationError({
            "status": (
                "Orders can only move forward through the delivery flow."
            )
        })

    order.status = new_status
    fields = ["status", "updated_at"]

    if (
        new_status == OrderStatus.DELIVERED
        and order.payment_method == PaymentMethod.COD
    ):
        from payments.models import Payment, PaymentRecordStatus

        order.payment_status = PaymentStatus.PAID
        fields.append("payment_status")

        Payment.objects.filter(
            order=order,
            method=PaymentMethod.COD,
        ).update(status=PaymentRecordStatus.SUCCESS)

    order.save(update_fields=fields)

    _record(order, new_status, note, by)

    title, kind = _STATUS_MESSAGES[new_status]

    notify(
        order.user,
        title,
        f"Order {order.order_number}: {OrderStatus(new_status).label}.",
        kind,
        order,
    )

    return order
