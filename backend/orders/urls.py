from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import AdminOrderViewSet
from .views import CheckoutSummaryView, CheckoutView, OrderViewSet

router = DefaultRouter()
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")
router.register("orders", OrderViewSet, basename="order")
urlpatterns = [
    path("checkout/", CheckoutView.as_view()),
    path("checkout/summary/", CheckoutSummaryView.as_view()),
] + router.urls
