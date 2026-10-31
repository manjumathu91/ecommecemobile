from django.contrib import admin, messages
from rest_framework.exceptions import APIException, ValidationError

from payments.services import refund_order

from .models import FLOW, Order, OrderItem, OrderStatus, OrderStatusHistory
from .services import advance_status, cancel_order


class ReadOnlyTabular(admin.TabularInline):
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ItemInline(ReadOnlyTabular):
    model = OrderItem


class HistoryInline(ReadOnlyTabular):
    model = OrderStatusHistory


def _detail(exc):
    d = exc.detail
    return "; ".join(str(v[0] if isinstance(v, list) else v) for v in d.values()) if isinstance(d, dict) else str(d)


def _status_action(status):
    @admin.action(description=f"Mark as: {OrderStatus(status).label}", permissions=["change"])
    def action(modeladmin, request, queryset):
        done = 0
        for order in queryset:
            try:
                advance_status(order.pk, status, by=request.user, note="Updated by admin")
                done += 1
            except ValidationError as exc:
                modeladmin.message_user(request, f"{order.order_number}: {_detail(exc)}", messages.WARNING)
        if done:
            modeladmin.message_user(request, f"{done} order(s) updated; customers were notified.")
    action.__name__ = f"mark_{status.lower()}"
    return action


@admin.action(description="Cancel selected orders (restores stock)", permissions=["change"])
def cancel_selected(modeladmin, request, queryset):
    for order in queryset:
        try:
            cancel_order(order.pk, note="Cancelled by admin", by=request.user)
            modeladmin.message_user(request, f"{order.order_number} cancelled.")
        except APIException as exc:
            modeladmin.message_user(request, f"{order.order_number}: {_detail(exc)}", messages.WARNING)


@admin.action(description="Refund via Razorpay (cancelled & paid orders)", permissions=["change"])
def refund_selected(modeladmin, request, queryset):
    for order in queryset:
        try:
            modeladmin.message_user(request, refund_order(order))
        except APIException as exc:
            modeladmin.message_user(request, f"{order.order_number}: {_detail(exc)}", messages.ERROR)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "user", "status", "payment_method", "payment_status", "total_amount", "created_at")
    list_filter = ("status", "payment_method", "payment_status", "created_at")
    search_fields = ("order_number", "user__email", "shipping_name", "shipping_phone")
    inlines = [ItemInline, HistoryInline]
    actions = [_status_action(s) for s in FLOW if s != OrderStatus.PLACED] + [cancel_selected, refund_selected]

    def get_readonly_fields(self, request, obj=None):  # status changes go through actions so stock/notifications stay consistent
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
