

from decimal import Decimal

from django.conf import settings
from django.db import models
from django.db.models import Q


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart",
    )
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def subtotal(self):
        return sum(
            (
                item.product.price * item.quantity
                for item in self.items.select_related("product").all()
            ),
            Decimal("0"),
        )

    @property
    def total(self):
        return sum(
            (
                item.line_total
                for item in self.items.select_related("product").all()
            ),
            Decimal("0"),
        )

    @property
    def discount(self):
        return self.subtotal - self.total


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="unique_product_per_cart",
            ),
            models.CheckConstraint(
                check=Q(quantity__gte=1),
                name="cart_item_quantity_gte_1",
            ),
        ]

    @property
    def line_total(self):
        return self.product.effective_price * self.quantity
