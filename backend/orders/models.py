import secrets
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils import timezone


class OrderStatus(models.TextChoices):
    PENDING_PAYMENT = "PENDING_PAYMENT", "Pending payment"
    PLACED = "PLACED", "Order placed"
    CONFIRMED = "CONFIRMED", "Order confirmed"
    PROCESSING = "PROCESSING", "Processing"
    SHIPPED = "SHIPPED", "Shipped"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for delivery"
    DELIVERED = "DELIVERED", "Delivered"
    CANCELLED = "CANCELLED", "Cancelled"


FLOW = [
    OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PROCESSING,
    OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED,
]
# Customers may cancel until the parcel is handed to the courier.
CANCELLABLE = {OrderStatus.PENDING_PAYMENT, OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PROCESSING}


class PaymentMethod(models.TextChoices):
    COD = "COD", "Cash on delivery"
    RAZORPAY = "RAZORPAY", "Razorpay"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PAID = "PAID", "Paid"
    FAILED = "FAILED", "Failed"
    REFUND_PENDING = "REFUND_PENDING", "Refund pending"
    REFUNDED = "REFUNDED", "Refunded"


def generate_order_number():
    return f"ORD{timezone.localdate():%y%m%d}{secrets.token_hex(3).upper()}"

class TaxType(models.TextChoices):
    INTRA_STATE = "INTRA_STATE", "CGST + SGST"
    INTER_STATE = "INTER_STATE", "IGST"
class Order(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    order_number = models.CharField(max_length=20, unique=True, default=generate_order_number, editable=False)
    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PLACED, db_index=True)
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices)
    payment_status = models.CharField(max_length=15, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)

    # Address snapshot: later edits/deletes of the saved address must not change past orders.
    address = models.ForeignKey("addresses.Address", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    shipping_name = models.CharField(max_length=120)
    shipping_phone = models.CharField(max_length=15)
    shipping_address = models.TextField()

    items_total = models.DecimalField(max_digits=12, decimal_places=2)
        # GST Billing Snapshot
    original_items_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    product_discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )


    
    taxable_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    gst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    cgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    sgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    igst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    tax_type = models.CharField(
        max_length=15,
        choices=TaxType.choices,
        default=TaxType.INTRA_STATE,
    )
    coupon = models.ForeignKey("coupons.Coupon", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    coupon_code = models.CharField(max_length=30, blank=True)
    coupon_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_charge = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    estimated_delivery = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("products.Product", null=True, on_delete=models.SET_NULL, related_name="order_items")
    product_name = models.CharField(max_length=200)  # purchase-time snapshot
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # price actually charged
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
      # Product-wise GST Snapshot
    hsn_code = models.CharField(
        max_length=8,
        blank=True,
    )

    gst_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    product_discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    coupon_discount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    taxable_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    gst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    cgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    sgst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    igst_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    status = models.CharField(max_length=20, choices=OrderStatus.choices)
    # status the order had before this change ("" for the first entry / entries written before this field existed)
    previous_status = models.CharField(max_length=20, choices=OrderStatus.choices, blank=True, default="")
    # note = reason for admin changes (mandatory when an order is moved backward)
    note = models.CharField(max_length=200, blank=True)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name_plural = "order status history"


class StockMovement(models.Model):
    """Append-only audit trail of every stock change (lives here so products never depends on orders)."""

    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="stock_movements")
    change = models.IntegerField(help_text="Positive = added, negative = removed")
    stock_after = models.PositiveIntegerField()
    reason = models.CharField(max_length=100)
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
