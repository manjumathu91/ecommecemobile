from rest_framework import serializers

from .models import ProductReview


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ("id", "user_name", "rating", "comment", "created_at")

    def get_user_name(self, obj):
        return obj.user.first_name or "Customer"
