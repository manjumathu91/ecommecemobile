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


class HistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ("status", "note", "created_at")


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
        reached.setdefault(h.status, h.created_at)
    current = order.status
    cur_idx = FLOW.index(current) if current in FLOW else -1
    stages = [
        {"status": s.value, "label": s.label, "completed": i <= cur_idx, "current": i == cur_idx, "timestamp": reached.get(s.value)}
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
