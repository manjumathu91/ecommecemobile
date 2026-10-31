from rest_framework import serializers


class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
