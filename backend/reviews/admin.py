
from django.contrib import admin
from core.admin_site import shop_admin_site

from .models import ProductReview


class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("product__name", "user__email")


shop_admin_site.register(ProductReview, ReviewAdmin)