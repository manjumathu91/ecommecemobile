from rest_framework import serializers

from .models import Payment


class CreatePaymentOrderSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()


class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(max_length=40)
    razorpay_payment_id = serializers.CharField(max_length=40)
    razorpay_signature = serializers.CharField(max_length=128)


class ReportSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField(max_length=40)
    outcome = serializers.ChoiceField(choices=["cancelled", "failed"])
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Payment
        fields = ("id", "order", "order_number", "method", "instrument", "amount", "currency", "status",
                  "razorpay_order_id", "razorpay_payment_id", "transaction_reference", "failure_reason", "created_at", "updated_at")
