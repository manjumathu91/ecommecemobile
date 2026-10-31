from django.urls import path

from . import views

urlpatterns = [
    path("", views.PaymentListView.as_view()),
    path("create-order/", views.CreatePaymentOrderView.as_view()),
    path("verify/", views.VerifyPaymentView.as_view()),
    path("report/", views.ReportPaymentView.as_view()),
    path("webhook/", views.WebhookView.as_view()),
]
