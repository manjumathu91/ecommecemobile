from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


class Address(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=15, validators=[RegexValidator(r"^\+?\d{10,14}$", "Enter a valid phone number.")])
    house_number = models.CharField(max_length=50)
    street = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=6, validators=[RegexValidator(r"^\d{6}$", "Enter a 6-digit PIN code.")])
    delivery_instructions = models.CharField(max_length=300, blank=True)
    is_default = models.BooleanField(default=False)
    latitude = models.DecimalField(
    max_digits=10,
    decimal_places=7,
    null=True,
    blank=True
)

longitude = models.DecimalField(
    max_digits=10,
    decimal_places=7,
    null=True,
    blank=True
)
created_at = models.DateTimeField(auto_now_add=True)

class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name_plural = "addresses"
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=models.Q(is_default=True), name="one_default_address_per_user")
        ]

def __str__(self):
        return f"{self.full_name}, {self.city}"
