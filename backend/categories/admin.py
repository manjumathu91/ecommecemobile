from django.contrib import admin
from core.admin_site import shop_admin_site
from .models import Category



class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}

shop_admin_site.register(Category, CategoryAdmin)