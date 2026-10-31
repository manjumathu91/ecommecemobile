from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class ProductReview(models.Model):
    product = models.ForeignKey("products.Product", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Meta:
    ordering = ["-created_at"]
    constraints = [
        models.UniqueConstraint(
            fields=["product", "user"],
            name="one_review_per_user_per_product"
        ),
        models.CheckConstraint(
            check=models.Q(rating__gte=1, rating__lte=5),
            name="rating_between_1_and_5"
        ),
    ]