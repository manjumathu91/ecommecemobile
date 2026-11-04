from rest_framework import serializers

from .models import CANCELLABLE, FLOW, Order, OrderItem, OrderStatus, OrderStatusHistory, PaymentMethod


class OrderItemSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "original_price", "unit_price", "quantity", "line_total", "thumbnail")

    def get_thumbnail(self, obj):
        if not obj.product_id:
            return None
        image = obj.product.images.first()
        request = self.context.get("request")
        return (request.build_absolute_uri(image.image.url) if request else image.image.url) if image else None


def is_backward(entry):
    """True for a history entry that moved the order back to an earlier delivery stage."""
    return (
        entry.previous_status in FLOW and entry.status in FLOW
        and FLOW.index(entry.status) < FLOW.index(entry.previous_status)
    )


class HistorySerializer(serializers.ModelSerializer):
    """Customer-facing history. The internal admin reason for a backward move is never shown to customers."""

    class Meta:
        model = OrderStatusHistory
        fields = ("status", "note", "created_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if is_backward(instance):
            data["note"] = ""
        return data


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = ("id", "order_number", "status", "status_label", "payment_method", "payment_status", "total_amount", "item_count", "created_at")

    def get_item_count(self, obj):
        return sum(i.quantity for i in obj.items.all())


class OrderDetailSerializer(OrderListSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = HistorySerializer(many=True, read_only=True)
    can_cancel = serializers.SerializerMethodField()

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + (
            "shipping_name", "shipping_phone", "shipping_address", "items_total", "coupon_code", "coupon_discount",
            "delivery_charge", "estimated_delivery", "items", "history", "can_cancel",
        )

    def get_can_cancel(self, obj):
        return obj.status in CANCELLABLE



class CheckoutSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    payment_method = serializers.ChoiceField(choices=PaymentMethod.choices)
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=30
    )


class SummarySerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=30
    )

def build_tracking(order):
    """Timeline for the tracking screen: one entry per stage with completion state and timestamp."""
    reached = {}
    for h in order.history.all():
        reached[h.status] = h.created_at  # latest time the stage was reached (an order may be moved back)
    current = order.status
    cur_idx = FLOW.index(current) if current in FLOW else -1
    stages = [
        {"status": s.value, "label": s.label, "completed": i <= cur_idx, "current": i == cur_idx,
         "timestamp": reached.get(s.value) if i <= cur_idx else None}
        for i, s in enumerate(FLOW)
    ]
    return {
        "order_number": order.order_number,
        "status": current,
        "status_label": OrderStatus(current).label,
        "is_cancelled": current == OrderStatus.CANCELLED,
        "awaiting_payment": current == OrderStatus.PENDING_PAYMENT,
        "estimated_delivery": None if current in (OrderStatus.CANCELLED, OrderStatus.DELIVERED) else order.estimated_delivery,
        "stages": stages,
        "history": HistorySerializer(order.history.all(), many=True).data,
    }


# ---------------------------------------------------------------------------
# Staff (admin) order management serializers.
# They read the existing Order / OrderItem / OrderStatusHistory / Payment
# models; nothing here creates a second order system.
# ---------------------------------------------------------------------------
class AdminHistorySerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    changed_by = serializers.SerializerMethodField()

    previous_status_label = serializers.SerializerMethodField()
    changed_by_id = serializers.IntegerField(read_only=True)
    reason = serializers.CharField(source="note", read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = (
            "previous_status", "previous_status_label", "status", "status_label", "reason", "note",
            "changed_by_id", "changed_by", "created_at",
        )

    def get_previous_status_label(self, obj):
        return OrderStatus(obj.previous_status).label if obj.previous_status else ""

    def get_changed_by(self, obj):
        return obj.changed_by.email if obj.changed_by_id else "System"


class AdminPaymentSerializer(serializers.Serializer):
    """Payment attempts for an order. Gateway signatures/secrets are never exposed."""

    id = serializers.IntegerField()
    method = serializers.CharField()
    instrument = serializers.CharField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    transaction_reference = serializers.CharField()
    razorpay_payment_id = serializers.CharField(allow_null=True)
    failure_reason = serializers.CharField()
    created_at = serializers.DateTimeField()


class AdminOrderListSerializer(serializers.ModelSerializer):
    customer = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_label = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_status_label = serializers.CharField(source="get_payment_status_display", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id", "order_number", "customer", "status", "status_label",
            "payment_method", "payment_method_label", "payment_status", "payment_status_label",
            "total_amount", "item_count", "shipping_name", "created_at",
        )

    def get_customer(self, obj):
        u = obj.user
        return {"id": u.id, "name": u.get_full_name() or obj.shipping_name, "email": u.email, "phone": u.phone}

    def get_item_count(self, obj):
        return sum(i.quantity for i in obj.items.all())


class AdminOrderDetailSerializer(AdminOrderListSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = AdminHistorySerializer(many=True, read_only=True)
    payments = serializers.SerializerMethodField()
    allowed_next_statuses = serializers.SerializerMethodField()
    allowed_previous_statuses = serializers.SerializerMethodField()

    class Meta(AdminOrderListSerializer.Meta):
        fields = AdminOrderListSerializer.Meta.fields + (
            "shipping_phone", "shipping_address",
            "original_items_total", "product_discount", "items_total", "coupon_code", "coupon_discount",
            "delivery_charge", "taxable_amount", "gst_amount", "cgst_amount", "sgst_amount", "igst_amount",
            "tax_type", "estimated_delivery", "updated_at",
            "items", "history", "payments", "allowed_next_statuses", "allowed_previous_statuses",
        )

    def get_payments(self, obj):
        return AdminPaymentSerializer(obj.payments.all(), many=True).data

    def get_allowed_next_statuses(self, obj):
        return allowed_next_statuses(obj)

    def get_allowed_previous_statuses(self, obj):
        return allowed_previous_statuses(obj)


class StatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True, max_length=200)
    # mandatory when moving an order backward (checked against the order's current status in the view/service)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=200)


def allowed_next_statuses(order):
    """Statuses an admin may move this order to (forward-only delivery flow, plus cancel)."""
    out = []
    if order.status in FLOW:
        out = [s.value for s in FLOW[FLOW.index(order.status) + 1:]]
    if order.status in CANCELLABLE:
        out.append(OrderStatus.CANCELLED.value)
    return out


def allowed_previous_statuses(order):
    """Earlier statuses an admin may move this order back to (a reason is then mandatory)."""
    return [s.value for s in FLOW[:FLOW.index(order.status)]] if order.status in FLOW else []
