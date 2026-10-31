from django.contrib.admin.apps import AdminConfig


class ShopAdminConfig(AdminConfig):
    default_site = "core.admin_site.ShopAdminSite"
