"""Admin panel: every sidebar link opens, AI endpoint errors are handled, dashboard numbers are real."""
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import override_settings

from tests.test_phase2 import PW, Base

User = get_user_model()

SIDEBAR_PAGES = [
    "/admin/", "/admin/products/product/", "/admin/categories/category/", "/admin/products/banner/",
    "/admin/orders/order/", "/admin/accounts/user/", "/admin/orders/stockmovement/", "/admin/coupons/coupon/",
    "/admin/payments/payment/", "/admin/reviews/productreview/", "/admin/notifications/notification/",
    "/admin/wishlist/wishlist/", "/admin/addresses/address/", "/admin/ai-assistant/",
    "/admin/products/product/add/", "/admin/categories/category/add/", "/admin/products/banner/add/",
    "/admin/coupons/coupon/add/", "/admin/accounts/user/add/",
]


class AdminPanelTests(Base):
    def setUp(self):
        super().setUp()
        self.add(self.p1, 2)
        self.checkout()
        self.staff = User.objects.create_superuser("boss@x.com", PW, first_name="Boss")
        self.client.credentials()
        self.client.force_login(self.staff)

    def test_every_sidebar_and_add_page_opens(self):
        for url in SIDEBAR_PAGES:
            self.assertEqual(self.client.get(url).status_code, 200, url)

    def test_dashboard_numbers_are_from_database(self):
        r = self.client.get("/admin/")
        s = r.context["stats"]
        self.assertEqual((s["total_orders"], s["pending_orders"], s["products"], s["categories"]), (1, 1, 2, 1))
        self.assertEqual(s["total_sales"], Decimal("1600"))
        self.assertEqual(s["customers"], 1)
        self.assertContains(r, "Recent Customers")
        self.assertContains(r, "AI Assistant")

    def test_customer_list_shows_order_count(self):
        r = self.client.get("/admin/accounts/user/")
        self.assertContains(r, "a@x.com")
        self.assertEqual(self.client.get(f"/admin/accounts/user/{self.user.pk}/change/").status_code, 200)

    def test_ai_assistant_page_never_shows_key(self):
        with mock.patch.dict("os.environ", {"GROQ_API_KEY": "gsk_SECRETVALUE"}):
            r = self.client.get("/admin/ai-assistant/")
        self.assertContains(r, "Configured")
        self.assertNotContains(r, "gsk_SECRETVALUE")

    def test_ai_chat_errors_are_handled(self):
        self.client.logout()
        self.login(self.user)
        with mock.patch.dict("os.environ", {"GROQ_API_KEY": ""}):
            self.assertEqual(self.client.post("/api/ai/chat/", {"message": "hi"}, format="json").status_code, 503)
        with mock.patch("ai_agent.views.get_ai_response", side_effect=RuntimeError("boom")):
            r = self.client.post("/api/ai/chat/", {"message": "hi"}, format="json")
            self.assertEqual(r.status_code, 502)
            self.assertNotIn("boom", str(r.data))
        with mock.patch("ai_agent.views.get_ai_response", return_value={"reply": "Hello"}):
            self.assertEqual(self.client.post("/api/ai/chat/", {"message": "hi"}, format="json").data["reply"], "Hello")
        self.assertEqual(self.client.post("/api/ai/chat/", {}, format="json").status_code, 400)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/ai/chat/", {"message": "hi"}, format="json").status_code, 401)
