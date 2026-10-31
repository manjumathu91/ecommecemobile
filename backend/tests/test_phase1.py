"""Run with:  DB_ENGINE=sqlite AUTH_THROTTLE=1000/min DJANGO_SECRET_KEY=test python manage.py test"""
from decimal import Decimal
import re
from urllib.parse import urlsplit, parse_qs

from django.core import mail
from django.test import override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from categories.models import Category
from products.models import Product

User = get_user_model()
PW = "Str0ng!Passw0rd"


class Base(APITestCase):
    def setUp(self):
        self.cat = Category.objects.create(name="Phones")
        self.p1 = Product.objects.create(category=self.cat, name="Alpha", price=Decimal("1000"), discount_price=Decimal("800"), stock=5)
        self.p2 = Product.objects.create(category=self.cat, name="Beta", price=Decimal("500"), stock=0)
        self.user = User.objects.create_user("a@x.com", PW, first_name="A")

    def login(self, user=None):
        r = self.client.post("/api/auth/login/", {"email": (user or self.user).email, "password": PW})
        self.assertEqual(r.status_code, 200, r.content)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])
        return r.data


class AuthTests(Base):
   
    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
    )
    def test_register_login_profile(self):
        # Step 1: Register a new customer
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "n@x.com",
                "password": PW,
                "first_name": "N",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

        # Registration must require email verification
        self.assertTrue(
            response.data["email_verification_required"]
        )
        self.assertNotIn("access", response.data)

        # Step 2: Check verification email
        self.assertEqual(len(mail.outbox), 1)

        email_body = mail.outbox[0].body

        match = re.search(r"https?://[^\s]+", email_body)

        self.assertIsNotNone(
            match,
            "Verification link was not found in the email.",
        )

        # Step 3: Extract UID and token from email link
        verification_url = urlsplit(
            match.group(0).rstrip(".,)")
        )

        query = parse_qs(verification_url.query)

        uid = query.get("uid", [None])[0]
        token = query.get("token", [None])[0]

        self.assertTrue(uid)
        self.assertTrue(token)

        # Step 4: Verify email through backend API
        verify_response = self.client.post(
            "/api/auth/verify-email/",
            {
                "uid": uid,
                "token": token,
            },
            format="json",
        )

        self.assertEqual(
            verify_response.status_code,
            200,
            verify_response.data,
        )

        # Step 5: Confirm account is verified
        user = User.objects.get(email="n@x.com")

        self.assertTrue(user.email_verified)

        # Step 6: Login after verification
        self.login(user)

        # Step 7: Check profile API
        profile = self.client.get("/api/auth/profile/")

        self.assertEqual(profile.status_code, 200)

        self.assertEqual(
            profile.data["email"],
            "n@x.com",
        )

    

    def test_weak_password_and_duplicate_email_rejected(self):
        self.assertEqual(self.client.post("/api/auth/register/", {"email": "n@x.com", "password": "123", "first_name": "N"}).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/register/", {"email": "A@x.com", "password": PW, "first_name": "N"}).status_code, 400)

    def test_logout_blacklists_refresh_token(self):
        tokens = self.login()
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": tokens["refresh"]}).status_code, 205)
        self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": tokens["refresh"]}).status_code, 401)

    def test_token_refresh_rotates(self):
        tokens = self.login()
        r = self.client.post("/api/auth/token/refresh/", {"refresh": tokens["refresh"]})
        self.assertEqual(r.status_code, 200)
        self.assertNotEqual(r.data["refresh"], tokens["refresh"])

    def test_forgot_and_reset_password(self):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        self.assertEqual(self.client.post("/api/auth/forgot-password/", {"email": "nobody@x.com"}).status_code, 200)
        uid, token = urlsafe_base64_encode(force_bytes(self.user.pk)), default_token_generator.make_token(self.user)
        r = self.client.post("/api/auth/reset-password/", {"uid": uid, "token": token, "new_password": "An0ther!Passw0rd"})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.client.post("/api/auth/reset-password/", {"uid": uid, "token": token, "new_password": "Th1rd!Passw0rd"}).status_code, 400)

    def test_protected_endpoint_requires_auth(self):
        self.assertEqual(self.client.get("/api/cart/").status_code, 401)


class ProductTests(Base):
    def test_list_search_filter_sort(self):
        self.assertEqual(self.client.get("/api/products/").data["count"], 2)
        self.assertEqual(self.client.get("/api/products/?search=alp").data["count"], 1)
        self.assertEqual(self.client.get("/api/products/?in_stock=true").data["count"], 1)
        self.assertEqual(self.client.get("/api/products/?max_price=600").data["results"][0]["name"], "Beta")  # discount price used
        r = self.client.get("/api/products/?ordering=effective_price")
        self.assertEqual([p["name"] for p in r.data["results"]], ["Beta", "Alpha"])  # 500 < 800
        self.assertEqual(self.client.get(f"/api/products/{self.p1.id}/").data["discount_percent"], 20)


class CartTests(Base):
    def setUp(self):
        super().setUp()
        self.login()

    def test_add_update_remove(self):
        r = self.client.post("/api/cart/add/", {"product_id": self.p1.id, "quantity": 2})
        self.assertEqual((r.status_code, r.data["item_count"], r.data["total"]), (200, 2, "1600.00"))
        r = self.client.post("/api/cart/update/", {"product_id": self.p1.id, "quantity": 3})
        self.assertEqual(r.data["subtotal"], "3000.00")
        self.assertEqual(r.data["discount"], "600.00")
        r = self.client.post("/api/cart/remove/", {"product_id": self.p1.id})
        self.assertEqual(r.data["item_count"], 0)

    def test_stock_validation(self):
        self.assertEqual(self.client.post("/api/cart/add/", {"product_id": self.p1.id, "quantity": 6}).status_code, 400)
        self.assertEqual(self.client.post("/api/cart/add/", {"product_id": self.p2.id, "quantity": 1}).status_code, 400)

    def test_cart_persists_across_sessions_and_is_isolated(self):
        self.client.post("/api/cart/add/", {"product_id": self.p1.id, "quantity": 1})
        self.client.credentials()
        self.login()
        self.assertEqual(self.client.get("/api/cart/").data["item_count"], 1)
        other = User.objects.create_user("b@x.com", PW, first_name="B")
        self.client.credentials()
        self.login(other)
        self.assertEqual(self.client.get("/api/cart/").data["item_count"], 0)

    def test_guest_merge_caps_to_stock(self):
        r = self.client.post("/api/cart/merge/", {"items": [{"product_id": self.p1.id, "quantity": 9}, {"product_id": self.p2.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.data["item_count"], 5)
        self.assertEqual({a["reason"] for a in r.data["adjustments"]}, {"capped_to_stock", "out_of_stock"})


class WishlistAddressTests(Base):
    def setUp(self):
        super().setUp()
        self.login()

    def test_wishlist(self):
        self.assertEqual(self.client.post("/api/wishlist/add/", {"product_id": self.p1.id}).status_code, 201)
        self.assertEqual(self.client.post("/api/wishlist/add/", {"product_id": self.p1.id}).status_code, 200)
        self.assertEqual(len(self.client.get("/api/wishlist/").data), 1)
        self.client.post("/api/wishlist/remove/", {"product_id": self.p1.id})
        self.assertEqual(len(self.client.get("/api/wishlist/").data), 0)

    def addr(self, **kw):
        d = dict(full_name="A B", phone="9876543210", house_number="1", street="Main", city="Chennai", state="TN", postal_code="600001")
        return {**d, **kw}

    def test_address_crud_and_default(self):
        a = self.client.post("/api/addresses/", self.addr())
        self.assertTrue(a.data["is_default"])
        b = self.client.post("/api/addresses/", self.addr(is_default=True))
        listing = self.client.get("/api/addresses/").data
        self.assertEqual(sum(x["is_default"] for x in listing), 1)
        self.client.delete(f"/api/addresses/{b.data['id']}/")
        self.assertTrue(self.client.get("/api/addresses/").data[0]["is_default"])
        self.assertEqual(self.client.post("/api/addresses/", self.addr(postal_code="12")).status_code, 400)

    def test_cannot_access_other_users_address(self):
        a = self.client.post("/api/addresses/", self.addr())
        other = User.objects.create_user("b@x.com", PW, first_name="B")
        self.client.credentials()
        self.login(other)
        self.assertEqual(self.client.get(f"/api/addresses/{a.data['id']}/").status_code, 404)
