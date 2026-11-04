from django.contrib import admin

from core.admin_site import shop_admin_site

from .models import Wishlist, WishlistItem


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "added_at")

    def has_add_permission(self, request, obj=None):
        return False


class WishlistAdmin(admin.ModelAdmin):
    list_display = ("user", "saved_products")
    search_fields = ("user__email", "user__first_name", "items__product__name")
    inlines = [WishlistItemInline]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("items")

    @admin.display(description="Saved products")
    def saved_products(self, obj):
        return len(obj.items.all())


class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("wishlist", "product", "added_at")
    search_fields = ("wishlist__user__email", "product__name")
    list_select_related = ("wishlist__user", "product")


shop_admin_site.register(Wishlist, WishlistAdmin)
shop_admin_site.register(WishlistItem, WishlistItemAdmin)
