
from django.contrib import admin
from .dashboard import dashboard_context


class ShopAdminSite(admin.AdminSite):
    enable_nav_sidebar = True
    site_header = "VELORA ADMIN"
    site_title = "Velora Commerce"
    index_title = "Dashboard"
    index_template = "admin/shop_dashboard.html"
    site_url = "/"

    

    def index(self, request, extra_context=None):
        extra = dict(extra_context or {})

        # Dashboard statistics
        extra.update(dashboard_context())

        return super().index(request, extra)

    
shop_admin_site = ShopAdminSite(name="shop_admin")