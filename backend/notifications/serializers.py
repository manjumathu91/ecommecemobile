from rest_framework import serializers

from .models import DeviceToken, Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "message", "type", "order", "is_read", "created_at")


class DeviceTokenSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=200)

    def validate_token(self, value):
        if not value.startswith(("ExponentPushToken[", "ExpoPushToken[")):
            raise serializers.ValidationError("Not a valid Expo push token.")
        return value
