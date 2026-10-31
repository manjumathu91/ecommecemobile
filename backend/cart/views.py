from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Cart
from .serializers import (
    CartAddSerializer, CartMergeSerializer, CartRemoveSerializer, CartSerializer, CartUpdateSerializer,
)


def _render(request, cart, **extra):
    cart = Cart.objects.prefetch_related("items__product__images", "items__product__category").get(pk=cart.pk)
    return Response({**CartSerializer(cart, context={"request": request}).data, **extra})


class CartView(APIView):
    def get(self, request):
        return _render(request, services.get_cart(request.user))


class CartAddView(APIView):
    def post(self, request):
        s = CartAddSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return _render(request, services.add_item(request.user, **s.validated_data))


class CartUpdateView(APIView):
    def post(self, request):
        s = CartUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return _render(request, services.set_quantity(request.user, **s.validated_data))


class CartRemoveView(APIView):
    def post(self, request):
        s = CartRemoveSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return _render(request, services.remove_item(request.user, s.validated_data["product_id"]))


class CartMergeView(APIView):
    def post(self, request):
        s = CartMergeSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        cart, adjustments = services.merge_guest_cart(request.user, s.validated_data["items"])
        return _render(request, cart, adjustments=adjustments)
