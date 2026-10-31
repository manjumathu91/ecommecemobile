from rest_framework.routers import SimpleRouter

from .views import AddressViewSet

router = SimpleRouter()
router.register("", AddressViewSet, basename="address")
urlpatterns = router.urls
