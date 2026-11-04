
from django.contrib import admin
from core.admin_site import shop_admin_site

from .models import Address


class AddressAdmin(admin.ModelAdmin):
    list_display = ("full_name", "user", "phone", "city", "state", "postal_code", "is_default")
    list_filter = ("is_default", "state")
    search_fields = ("full_name", "user__email", "phone", "city", "postal_code")


shop_admin_site.register(Address, AddressAdmin)