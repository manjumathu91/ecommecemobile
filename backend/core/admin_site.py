import os

from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path

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
        # Dashboard statistics (calculated from real order / product / customer records)
        extra.update(dashboard_context())
        return super().index(request, extra)

    def get_urls(self):
        custom = [path("ai-assistant/", self.admin_view(self.ai_assistant_view), name="ai_assistant")]
        return custom + super().get_urls()

    def ai_assistant_view(self, request):
        """Configuration status only. Chats are not stored by the backend, so there is no usage
        history to show; the API key and customers' messages are never displayed."""
        context = {
            **self.each_context(request),
            "title": "AI Assistant",
            "configured": bool(os.getenv("GROQ_API_KEY")),
            "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            "endpoint": "/api/ai/chat/",
        }
        return TemplateResponse(request, "admin/ai_assistant.html", context)


shop_admin_site = ShopAdminSite(name="shop_admin")
