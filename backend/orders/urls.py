from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CheckoutSummaryView, CheckoutView, OrderViewSet

router = DefaultRouter()
router.register("orders", OrderViewSet, basename="order")
urlpatterns = [
    path("checkout/", CheckoutView.as_view()),
    path("checkout/summary/", CheckoutSummaryView.as_view()),
] + router.urls
