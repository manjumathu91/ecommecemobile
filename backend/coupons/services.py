from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from orders.models import Order, OrderStatus

from .models import Coupon

CENT = Decimal("0.01")


def calculate_discount(coupon, amount):
    if coupon.discount_type == Coupon.PERCENT:
        discount = amount * coupon.value / Decimal("100")
        if coupon.max_discount is not None:
            discount = min(discount, coupon.max_discount)
    else:
        discount = coupon.value
    return min(discount, amount).quantize(CENT, rounding=ROUND_HALF_UP)


def validate_coupon(code, user, amount, lock=False):
    """Returns (coupon, discount). Raises ValidationError with a user-facing message."""
    qs = Coupon.objects.select_for_update() if lock else Coupon.objects
    coupon = qs.filter(code__iexact=(code or "").strip()).first()
    now = timezone.now()
    if not coupon or not coupon.is_active:
        raise ValidationError({"coupon_code": "Invalid coupon code."})
    if not (coupon.valid_from <= now <= coupon.valid_to):
        raise ValidationError({"coupon_code": "This coupon is not valid at this time."})
    if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
        raise ValidationError({"coupon_code": "This coupon has been fully redeemed."})
    if amount < coupon.min_order_amount:
        raise ValidationError({"coupon_code": f"Minimum order amount for this coupon is {coupon.min_order_amount}."})
    used = Order.objects.filter(user=user, coupon=coupon).exclude(status=OrderStatus.CANCELLED).count()
    if used >= coupon.per_user_limit:
        raise ValidationError({"coupon_code": "You have already used this coupon."})
    return coupon, calculate_discount(coupon, amount)
