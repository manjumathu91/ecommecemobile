from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
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
    # GPS location of the delivery point (optional, picked on the map in the mobile app)
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]
        verbose_name_plural = "addresses"
        constraints = [
            models.UniqueConstraint(fields=["user"], condition=models.Q(is_default=True), name="one_default_address_per_user")
        ]

    def __str__(self):
        return f"{self.full_name}, {self.city}"
