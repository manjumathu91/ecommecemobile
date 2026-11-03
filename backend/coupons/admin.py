
from django.contrib import admin
from core.admin_site import shop_admin_site

from .models import Coupon


class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "value",
        "min_order_amount",
        "valid_from",
        "valid_to",
        "used_count",
        "usage_limit",
        "is_active",
    )
    list_filter = ("is_active", "discount_type")
    search_fields = ("code",)


shop_admin_site.register(Coupon, CouponAdmin)