from django.urls import path

from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view()),
    path("read-all/", views.NotificationReadAllView.as_view()),
    path("device-token/", views.DeviceTokenView.as_view()),
    path("<int:pk>/read/", views.NotificationReadView.as_view()),
]
