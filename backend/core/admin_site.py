

from django.contrib import admin

from .dashboard import dashboard_context


class ShopAdminSite(admin.AdminSite):

    site_header = "SHOP ADMIN"
    site_title = "Shop Management"
    index_title = "Dashboard"

    # Custom dashboard template
    index_template = "admin/shop_dashboard.html"

    # Custom header branding
    site_url = "/"

    def index(self, request, extra_context=None):

        extra = dict(extra_context or {})

        # Load dashboard data for authorized users
        if request.user.is_superuser or request.user.has_perm("orders.view_order"):
            extra.update(dashboard_context())

        return super().index(request, extra)
