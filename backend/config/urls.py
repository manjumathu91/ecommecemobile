from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from core.admin_site import shop_admin_site

urlpatterns = [
    path("admin/", shop_admin_site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("categories.urls")),
    path("api/", include("products.urls")),
    path("api/cart/", include("cart.urls")),
    path("api/wishlist/", include("wishlist.urls")),
    path("api/addresses/", include("addresses.urls")),
    path("api/", include("coupons.urls")),
    path("api/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/", include("reviews.urls")),
    path(
    "api/ai/",
    include("ai_agent.urls")
),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
