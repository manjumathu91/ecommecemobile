from rest_framework import serializers

from .models import Address


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            "id", "full_name", "phone", "house_number", "street", "city", "state",
            "postal_code", "delivery_instructions", "is_default",
        )
