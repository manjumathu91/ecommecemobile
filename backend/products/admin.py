

from django.contrib import admin
from django.db.models import F

from orders.inventory import log_stock
from orders.models import StockMovement

from .models import Banner, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class LowStockFilter(admin.SimpleListFilter):
    title = "stock level"
    parameter_name = "stock_level"

    def lookups(self, request, model_admin):
        return [
            ("low", "Low stock"),
            ("out", "Out of stock"),
        ]

    def queryset(self, request, queryset):
        if self.value() == "low":
            return queryset.filter(
                stock__gt=0,
                stock__lte=F("low_stock_threshold"),
            )

        if self.value() == "out":
            return queryset.filter(stock=0)

        return queryset


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "category",
        "price",
        "discount_price",
        "hsn_code",
        "gst_rate",
        "stock",
        "is_active",
        "is_featured",
    )

    list_filter = (
        "is_active",
        "is_featured",
        "category",
        "gst_rate",
        LowStockFilter,
    )

    search_fields = (
        "name",
        "description",
        "hsn_code",
    )

    list_editable = (
        "gst_rate",
        "stock",
        "is_active",
        "is_featured",
    )

    inlines = [ProductImageInline]

    prepopulated_fields = {
        "slug": ("name",),
    }

    fieldsets = (
        (
            "Product Information",
            {
                "fields": (
                    "category",
                    "name",
                    "slug",
                    "description",
                ),
            },
        ),
        (
            "Pricing & GST Configuration",
            {
                "fields": (
                    "price",
                    "discount_price",
                    "hsn_code",
                    "gst_rate",
                ),
                "description": (
                    "Set the applicable HSN code and GST rate "
                    "for this product."
                ),
            },
        ),
        (
            "Inventory",
            {
                "fields": (
                    "stock",
                    "low_stock_threshold",
                    "sold_count",
                ),
            },
        ),
        (
            "Product Status",
            {
                "fields": (
                    "is_active",
                    "is_featured",
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):

        old_stock = (
            Product.objects.filter(pk=obj.pk)
            .values_list("stock", flat=True)
            .first()
            if change
            else 0
        )

        super().save_model(request, obj, form, change)

        if obj.stock != (old_stock or 0):
            log_stock(
                obj,
                obj.stock - (old_stock or 0),
                "Admin adjustment" if change else "Initial stock",
            )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):

    list_display = (
        "created_at",
        "product",
        "change",
        "stock_after",
        "reason",
        "order",
    )

    list_filter = ("reason",)

    search_fields = ("product__name",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):

    list_display = (
        "title",
        "position",
        "is_active",
    )

    list_editable = (
        "position",
        "is_active",
    )
