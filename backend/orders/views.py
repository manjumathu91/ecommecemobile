from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from . import services
from .invoice import render_invoice_pdf
from .admin_views import apply_order_filters
from .models import Order
from .serializers import (
    CheckoutSerializer, OrderDetailSerializer, OrderListSerializer, SummarySerializer, build_tracking,
)



class CheckoutSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = SummarySerializer(data=request.data)
        s.is_valid(raise_exception=True)

        return Response(
            services.checkout_summary(
                request.user,
                coupon_code=s.validated_data.get("coupon_code"),
                address_id=s.validated_data["address_id"],
            )
        )


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        order = services.place_order(request.user, **s.validated_data)
        order = _queryset(request.user).get(pk=order.pk)
        return Response(OrderDetailSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)


def _queryset(user):
    return Order.objects.filter(user=user).prefetch_related("items__product__images", "history")


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    
    """Always scoped to the caller: other customers' orders return 404."""
    permission_classes = [IsAuthenticated]
    

    search_fields = ("order_number", "items__product_name")
    ordering_fields = ("created_at", "total_amount")

    def get_queryset(self):
        qs = _queryset(self.request.user)
        # Order history filters for the customer: ?status= ?payment_status= ?date_from= ?date_to=
        return apply_order_filters(qs, self.request.query_params) if self.action == "list" else qs

    def get_serializer_class(self):
        return OrderListSerializer if self.action == "list" else OrderDetailSerializer

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = services.cancel_order(pk, user=request.user)
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderDetailSerializer(order, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def tracking(self, request, pk=None):
        return Response(build_tracking(self.get_object()))

    @action(detail=True, methods=["get"])
    def invoice(self, request, pk=None):
        order = self.get_object()
        if order.status == "PENDING_PAYMENT" or order.status == "CANCELLED":
            raise ValidationError({"detail": "An invoice is available only for confirmed orders."})
        pdf = render_invoice_pdf({
            "order_number": order.order_number, "date": timezone.localtime(order.created_at).strftime("%d %b %Y"),
            "customer": order.shipping_name, "shipping_address": order.shipping_address,
            "payment_method": order.get_payment_method_display(), "payment_status": order.get_payment_status_display(),
            "items": [{"name": i.product_name, "qty": i.quantity, "unit_price": i.unit_price, "line_total": i.line_total} for i in order.items.all()],
            "items_total": order.items_total, "coupon_code": order.coupon_code, "coupon_discount": order.coupon_discount,
            "delivery_charge": order.delivery_charge, "total_amount": order.total_amount,
        })
        resp = HttpResponse(pdf, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="invoice-{order.order_number}.pdf"'
        return resp
