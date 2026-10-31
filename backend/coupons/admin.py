from django.contrib import admin

from .models import Coupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "discount_type", "value", "min_order_amount", "valid_from", "valid_to", "used_count", "usage_limit", "is_active")
    list_filter = ("is_active", "discount_type")
    search_fields = ("code",)
