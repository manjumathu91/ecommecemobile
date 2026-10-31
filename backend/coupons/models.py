from decimal import Decimal

from django.db import models


class Coupon(models.Model):
    PERCENT, FLAT = "PERCENT", "FLAT"
    TYPE_CHOICES = [(PERCENT, "Percentage"), (FLAT, "Flat amount")]

    code = models.CharField(max_length=30, unique=True)
    discount_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=PERCENT)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Cap for percentage coupons")
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Total redemptions allowed (blank = unlimited)")
    used_count = models.PositiveIntegerField(default=0, editable=False)
    per_user_limit = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code
