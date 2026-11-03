
from django.contrib import admin
from core.admin_site import shop_admin_site

from .models import Notification


class NotificationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "user", "type", "title", "is_read")
    list_filter = ("type", "is_read")
    search_fields = ("user__email", "title")


shop_admin_site.register(Notification, NotificationAdmin)