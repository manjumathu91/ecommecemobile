from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BannerListView, ProductViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
urlpatterns = [path("banners/", BannerListView.as_view())] + router.urls
