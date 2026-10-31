import logging

from rest_framework import generics, status
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Payment
from .serializers import (
    CreatePaymentOrderSerializer, PaymentSerializer, ReportSerializer, VerifyPaymentSerializer,
)

log = logging.getLogger(__name__)


class PaymentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user).select_related("order")


class CreatePaymentOrderView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        s = CreatePaymentOrderSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(services.create_payment_order(request.user, s.validated_data["order_id"]))


class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        s = VerifyPaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        payment, outcome = services.verify_payment(request.user, **s.validated_data)
        body = {"status": outcome, "order_id": payment.order_id, "payment": PaymentSerializer(payment).data}
        # 202: gateway has not captured yet; the signed webhook will finalise it
        return Response(body, status=status.HTTP_202_ACCEPTED if outcome == "pending" else status.HTTP_200_OK)


class ReportPaymentView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        s = ReportSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        payment = services.report_client_event(request.user, **s.validated_data)
        return Response(PaymentSerializer(payment).data)

class WebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.body

        try:
            result = services.handle_webhook(
                raw,
                request.headers.get("X-Razorpay-Signature", ""),
                request.headers.get("X-Razorpay-Event-Id", ""),
            )

        except PermissionError:
            return Response(
                {"detail": "Invalid signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ValueError:
            return Response(
                {"detail": "Malformed payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"result": result})

