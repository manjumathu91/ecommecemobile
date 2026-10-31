from django.db import transaction
from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import OrderItem, OrderStatus
from products.models import Product

from .models import ProductReview
from .serializers import ReviewSerializer


def refresh_product_rating(product):
    agg = ProductReview.objects.filter(product=product).aggregate(avg=Avg("rating"), n=Count("id"))
    Product.objects.filter(pk=product.pk).update(avg_rating=round(agg["avg"] or 0, 2), review_count=agg["n"])


class ReviewListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return ProductReview.objects.filter(product_id=self.kwargs["product_id"]).select_related("user")


class ReviewWriteView(APIView):
    """POST creates or updates the caller's single review; DELETE removes it.
    Only customers with a delivered order containing the product may review (verified purchase)."""

    permission_classes = [IsAuthenticated]

    def _product(self, product_id):
        product = Product.objects.filter(pk=product_id, is_active=True).first()
        if not product:
            raise NotFound("Product not found.")
        return product

    @transaction.atomic
    def post(self, request, product_id):
        product = self._product(product_id)
        if not OrderItem.objects.filter(order__user=request.user, order__status=OrderStatus.DELIVERED, product=product).exists():
            raise PermissionDenied("You can review a product only after it has been delivered to you.")
        s = ReviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        review, created = ProductReview.objects.update_or_create(
            product=product, user=request.user,
            defaults={"rating": s.validated_data["rating"], "comment": s.validated_data.get("comment", "")},
        )
        refresh_product_rating(product)
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @transaction.atomic
    def delete(self, request, product_id):
        product = self._product(product_id)
        deleted, _ = ProductReview.objects.filter(product=product, user=request.user).delete()
        if not deleted:
            raise ValidationError({"detail": "You have not reviewed this product."})
        refresh_product_rating(product)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewView(ReviewListView):
    """GET (public) lists reviews; POST/DELETE (authenticated) write the caller's own review."""

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsAuthenticated()]

    _product = ReviewWriteView._product
    post = ReviewWriteView.post
    delete = ReviewWriteView.delete
