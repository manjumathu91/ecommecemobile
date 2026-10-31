from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product

from .models import Wishlist, WishlistItem
from .serializers import WishlistItemSerializer, WishlistProductSerializer


def _items(user):
    wishlist, _ = Wishlist.objects.get_or_create(user=user)
    return wishlist, wishlist.items.select_related("product__category").prefetch_related("product__images")


class WishlistView(APIView):
    def get(self, request):
        _, items = _items(request.user)
        return Response(WishlistItemSerializer(items, many=True, context={"request": request}).data)


class WishlistAddView(APIView):
    def post(self, request):
        s = WishlistProductSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            product = Product.objects.get(pk=s.validated_data["product_id"], is_active=True)
        except Product.DoesNotExist:
            raise ValidationError({"product_id": "Product not found."})
        wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
        item, created = WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)  # idempotent
        data = WishlistItemSerializer(item, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class WishlistRemoveView(APIView):
    def post(self, request):
        s = WishlistProductSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        WishlistItem.objects.filter(
            wishlist__user=request.user, product_id=s.validated_data["product_id"]
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
