from django.urls import path

from . import views

urlpatterns = [
    path("", views.CartView.as_view()),
    path("add/", views.CartAddView.as_view()),
    path("update/", views.CartUpdateView.as_view()),
    path("remove/", views.CartRemoveView.as_view()),
    path("merge/", views.CartMergeView.as_view()),
]
