from django.urls import path

from . import views

urlpatterns = [
    path("", views.WishlistView.as_view()),
    path("add/", views.WishlistAddView.as_view()),
    path("remove/", views.WishlistRemoveView.as_view()),
]
