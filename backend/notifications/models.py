from django.conf import settings
from django.db import models


class Notification(models.Model):
    ORDER, PAYMENT, SHIPPING, DELIVERY, SYSTEM = "ORDER", "PAYMENT", "SHIPPING", "DELIVERY", "SYSTEM"
    TYPE_CHOICES = [(t, t.title()) for t in (ORDER, PAYMENT, SHIPPING, DELIVERY, SYSTEM)]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=120)
    message = models.CharField(max_length=300)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=SYSTEM)
    order = models.ForeignKey("orders.Order", null=True, blank=True, on_delete=models.CASCADE, related_name="+")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "is_read"])]


class DeviceToken(models.Model):
    """Expo push token registered by the mobile app."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="device_tokens")
    token = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
