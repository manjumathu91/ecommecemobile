"""Staff order-management API (normal e-commerce customer orders only).

Mounted at /api/admin/orders/. It reuses the existing Order/OrderItem models and the
existing business logic in orders.services (advance_status / cancel_order), so stock,
coupons, refunds flags, notifications and the status history stay consistent with the
Django admin and the customer API.
"""
from datetime import datetime

from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from . import services
from .models import FLOW, Order, OrderStatus
from .serializers import (
    AdminHistorySerializer, AdminOrderDetailSerializer, AdminOrderListSerializer, StatusUpdateSerializer,
)


class CanManageOrders(BasePermission):
    """Staff only; view_order to read, change_order to update status."""

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.is_active and u.is_staff):
            return False
        needed = "orders.view_order" if request.method in ("GET", "HEAD", "OPTIONS") else "orders.change_order"
        return u.has_perm(needed)


def _parse_date(value, field):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError({field: "Use the format YYYY-MM-DD."})


def apply_order_filters(qs, params):
    """Shared filters: status, payment_status, payment_method, date_from, date_to."""
    for field in ("status", "payment_status", "payment_method"):
        value = params.get(field)
        if value:
            qs = qs.filter(**{field: value.upper()})
    if params.get("date_from"):
        qs = qs.filter(created_at__date__gte=_parse_date(params["date_from"], "date_from"))
    if params.get("date_to"):
        qs = qs.filter(created_at__date__lte=_parse_date(params["date_to"], "date_to"))
    return qs


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET   /api/admin/orders/                  list (search, filters, ordering, pagination)
    GET   /api/admin/orders/{id}/             complete order details
    POST  /api/admin/orders/{id}/status/      update order status {"status": "SHIPPED", "note": ""};
                                              moving BACKWARD needs {"status": "PROCESSING", "reason": "..."}
    GET   /api/admin/orders/{id}/history/     status history of one order
    Filters: ?status= ?payment_status= ?payment_method= ?date_from= ?date_to= ?user=<customer id>
    Search : ?search= (order number, customer name/email/phone, shipping name/phone, product name)
    """

    permission_classes = [CanManageOrders]
    search_fields = (
        "order_number", "user__email", "user__first_name", "user__last_name", "user__phone",
        "shipping_name", "shipping_phone", "items__product_name",
    )
    ordering_fields = ("created_at", "total_amount", "status")
    ordering = ("-created_at",)

    def get_queryset(self):
        qs = Order.objects.select_related("user").prefetch_related(
            "items__product__images", "history__changed_by", "payments"
        )
        p = self.request.query_params
        if p.get("user"):
            if not p["user"].isdigit():
                raise ValidationError({"user": "Must be a customer id."})
            qs = qs.filter(user_id=int(p["user"]))
        return apply_order_filters(qs, p)

    def get_serializer_class(self):
        return AdminOrderListSerializer if self.action == "list" else AdminOrderDetailSerializer

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        order = self.get_object()
        s = StatusUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        new, note = s.validated_data["status"], s.validated_data.get("note", "")
        if new == OrderStatus.CANCELLED:
            services.cancel_order(order.pk, note=note or "Cancelled by admin", by=request.user)
        elif order.status in FLOW and new in FLOW and FLOW.index(new) < FLOW.index(order.status):
            # backward move: admins only, mandatory reason (both enforced in the service layer)
            services.revert_status(order.pk, new, by=request.user, reason=s.validated_data.get("reason", ""))
        else:
            services.advance_status(order.pk, new, by=request.user, note=note or "Updated by admin")
        return Response(AdminOrderDetailSerializer(self.get_queryset().get(pk=order.pk), context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        return Response(AdminHistorySerializer(self.get_object().history.all(), many=True).data)
