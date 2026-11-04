from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import path, reverse
from django.utils.html import format_html
from rest_framework.exceptions import APIException, ValidationError
from core.admin_site import shop_admin_site
from payments.services import refund_order

from .models import CANCELLABLE, FLOW, Order, OrderItem, OrderStatus, OrderStatusHistory, StockMovement
from .serializers import allowed_next_statuses, allowed_previous_statuses
from .services import advance_status, can_revert_status, cancel_order, revert_status


class ReadOnlyTabular(admin.TabularInline):
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ItemInline(ReadOnlyTabular):
    """Ordered products with quantities and prices (snapshot taken at purchase time)."""

    model = OrderItem
    fields = ("product_name", "quantity", "original_price", "unit_price", "line_total", "hsn_code", "gst_rate", "gst_amount")
    readonly_fields = fields


class HistoryInline(ReadOnlyTabular):
    model = OrderStatusHistory
    # Complete status history: when, who, previous -> new status, and the note / reason
    fields = ("created_at", "changed_by", "previous_status", "status", "note")
    readonly_fields = fields


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



STATUS_COLOURS = {
    "PENDING_PAYMENT": "#8a6d3b", "PLACED": "#2563eb", "CONFIRMED": "#0e7490", "PROCESSING": "#7c3aed",
    "SHIPPED": "#b45309", "OUT_FOR_DELIVERY": "#c2410c", "DELIVERED": "#15803d", "CANCELLED": "#b91c1c",
}


class OrderAdmin(admin.ModelAdmin):
    """Customer shopping orders. Status changes always go through orders.services so stock,
    coupons, payments and customer notifications stay consistent."""

    change_form_template = "admin/orders/order/change_form.html"
    list_display = (
        "order_number", "customer_name", "customer_email", "customer_phone", "item_count",
        "total_amount", "payment_method", "payment_status", "coloured_status", "created_at",
    )
    list_display_links = ("order_number",)
    list_filter = ("status", "payment_method", "payment_status", "created_at")
    date_hierarchy = "created_at"
    list_select_related = ("user",)
    list_per_page = 25
    search_fields = (
        "order_number", "user__email", "user__first_name", "user__last_name", "user__phone",
        "shipping_name", "shipping_phone", "items__product_name",
    )
    inlines = [ItemInline, HistoryInline]
    actions = [_status_action(s) for s in FLOW if s != OrderStatus.PLACED] + [cancel_selected, refund_selected]

    fieldsets = (
        ("Order", {"fields": ("order_number", "status", "created_at", "updated_at", "estimated_delivery")}),
        ("Customer", {"fields": ("customer_details", "customer_order_history")}),
        ("Shipping address", {"fields": ("shipping_name", "shipping_phone", "shipping_address")}),
        ("Payment", {"fields": ("payment_method", "payment_status", "payment_records")}),
        ("Amounts", {"fields": (
            "original_items_total", "product_discount", "items_total", "coupon_code", "coupon_discount",
            "delivery_charge", "taxable_amount", "gst_amount", "cgst_amount", "sgst_amount", "igst_amount",
            "tax_type", "total_amount",
        )}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("items")

    def lookup_allowed(self, lookup, value):
        # lets the customer page link to ?user__id__exact=<id> (customer order history)
        return lookup == "user__id__exact" or super().lookup_allowed(lookup, value)

    # ---- read-only: every status change goes through the service layer ----
    def get_readonly_fields(self, request, obj=None):
        custom = ["customer_details", "customer_order_history", "payment_records"]
        return [f.name for f in self.model._meta.fields] + custom

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    # ---- list columns ----
    @admin.display(description="Customer", ordering="user__first_name")
    def customer_name(self, obj):
        return obj.user.get_full_name() or obj.shipping_name

    @admin.display(description="Email", ordering="user__email")
    def customer_email(self, obj):
        return obj.user.email

    @admin.display(description="Phone")
    def customer_phone(self, obj):
        return obj.user.phone or obj.shipping_phone

    @admin.display(description="Items")
    def item_count(self, obj):
        return sum(i.quantity for i in obj.items.all())

    @admin.display(description="Status", ordering="status")
    def coloured_status(self, obj):
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap">{}</span>',
            STATUS_COLOURS.get(obj.status, "#444"), obj.get_status_display(),
        )

    # ---- detail page blocks ----
    @admin.display(description="Customer")
    def customer_details(self, obj):
        u = obj.user
        link = reverse("shop_admin:accounts_user_change", args=[u.pk])
        return format_html(
            '<a href="{}">{}</a><br>Email: {}<br>Phone: {}<br>Registered: {}',
            link, u.get_full_name() or u.email, u.email, u.phone or "-", u.date_joined.strftime("%d %b %Y"),
        )

    @admin.display(description="Customer order history")
    def customer_order_history(self, obj):
        url = reverse("shop_admin:orders_order_changelist") + f"?user__id__exact={obj.user_id}"
        total = Order.objects.filter(user_id=obj.user_id).count()
        return format_html('<a href="{}">View all {} order(s) by this customer</a>', url, total)

    @admin.display(description="Payment records")
    def payment_records(self, obj):
        rows = [
            format_html("{} · {} · ₹{} · ref {}", p.get_method_display(), p.get_status_display(), p.amount,
                        p.razorpay_payment_id or p.transaction_reference or "-")
            for p in obj.payments.all()
        ]
        return format_html("<br>".join(["{}"] * len(rows)), *rows) if rows else "No payment record yet"

    # ---- status update form on the order page ----
    def get_urls(self):
        custom = [path("<int:object_id>/update-status/", self.admin_site.admin_view(self.update_status_view),
                       name="orders_order_update_status")]
        return custom + super().get_urls()

    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra = dict(extra_context or {})
        order = Order.objects.filter(pk=object_id).first()
        if order:
            extra["next_statuses"] = [(s, OrderStatus(s).label) for s in allowed_next_statuses(order)]
            extra["previous_statuses"] = (
                [(s, OrderStatus(s).label) for s in allowed_previous_statuses(order)]
                if can_revert_status(request.user) else []
            )
            extra["can_update_status"] = self.has_change_permission(request, order)
        return super().change_view(request, object_id, form_url, extra)

    def update_status_view(self, request, object_id):
        back = reverse("shop_admin:orders_order_change", args=[object_id])
        order = Order.objects.filter(pk=object_id).first()
        if request.method != "POST" or not order or not self.has_change_permission(request, order):
            self.message_user(request, "You cannot update this order.", messages.ERROR)
            return HttpResponseRedirect(back)
        new, note = request.POST.get("status", ""), request.POST.get("note", "").strip()[:200]
        try:
            if new == OrderStatus.CANCELLED:
                cancel_order(order.pk, note=note or "Cancelled by admin", by=request.user)
            elif order.status in FLOW and new in FLOW and FLOW.index(new) < FLOW.index(order.status):
                revert_status(order.pk, new, by=request.user, reason=request.POST.get("reason", ""))
            else:
                advance_status(order.pk, new, by=request.user, note=note or "Updated by admin")
            self.message_user(request, f"{order.order_number} is now '{OrderStatus(new).label}'. The customer was notified.")
        except (ValidationError, APIException) as exc:
            self.message_user(request, f"{order.order_number}: {_detail(exc)}", messages.ERROR)
        return HttpResponseRedirect(back)


shop_admin_site.register(Order, OrderAdmin)
