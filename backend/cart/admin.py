
from django.contrib import admin
from core.admin_site import shop_admin_site

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


class CartAdmin(admin.ModelAdmin):
    list_display = ("user", "updated_at")
    inlines = [CartItemInline]


shop_admin_site.register(Cart, CartAdmin)