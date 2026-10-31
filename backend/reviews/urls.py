from django.urls import path

from .views import ReviewView

urlpatterns = [path("products/<int:product_id>/reviews/", ReviewView.as_view())]
