from django.contrib import admin

from .models import Payment, WebhookEvent


class ReadOnly(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Payment)
class PaymentAdmin(ReadOnly):
    list_display = ("created_at", "order", "method", "instrument", "amount", "status", "razorpay_payment_id")
    list_filter = ("status", "method")
    search_fields = ("order__order_number", "razorpay_order_id", "razorpay_payment_id")


@admin.register(WebhookEvent)
class WebhookEventAdmin(ReadOnly):
    list_display = ("received_at", "event", "event_id", "processed", "note")
    list_filter = ("event", "processed")
