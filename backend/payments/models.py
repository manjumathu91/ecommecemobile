from django.db import models

from orders.models import Order, PaymentMethod


class PaymentRecordStatus(models.TextChoices):
    CREATED = "CREATED", "Created"
    SUCCESS = "SUCCESS", "Success"
    FAILED = "FAILED", "Failed"
    CANCELLED = "CANCELLED", "Cancelled"


class Payment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="payments")
    method = models.CharField(max_length=10, choices=PaymentMethod.choices)
    instrument = models.CharField(max_length=30, blank=True, help_text="upi / card / netbanking ... as reported by Razorpay")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    status = models.CharField(max_length=10, choices=PaymentRecordStatus.choices, default=PaymentRecordStatus.CREATED, db_index=True)
    razorpay_order_id = models.CharField(max_length=40, unique=True, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=40, unique=True, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=128, blank=True)
    transaction_reference = models.CharField(max_length=60, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class WebhookEvent(models.Model):
    """One row per Razorpay webhook delivery id: makes webhook processing idempotent."""

    event_id = models.CharField(max_length=100, unique=True)
    event = models.CharField(max_length=60)
    payload = models.JSONField()
    processed = models.BooleanField(default=False)
    note = models.CharField(max_length=255, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
