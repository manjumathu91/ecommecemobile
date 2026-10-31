from rest_framework.response import Response
from rest_framework.views import APIView

from cart.services import get_cart

from .serializers import CouponValidateSerializer
from .services import validate_coupon


class CouponValidateView(APIView):
    """Validates a code against the caller's current cart total (server-side, never trusts a client amount)."""

    def post(self, request):
        s = CouponValidateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        amount = get_cart(request.user).total
        coupon, discount = validate_coupon(s.validated_data["code"], request.user, amount)
        return Response({"code": coupon.code, "discount": discount, "cart_total": amount, "discounted_total": amount - discount})
