from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny

from .models import Banner, Product
from .serializers import BannerSerializer, ProductDetailSerializer, ProductListSerializer


def _decimal(value):
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError):
        return None




class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Product listing and filtering API."""

    permission_classes = [AllowAny]

    search_fields = ["name", "category__name", "description"]

    ordering_fields = [
        "effective_price_db",
        
        "created_at",
        "sold_count",
        "avg_rating",
    ]

    ordering = ["-created_at"]

    def get_serializer_class(self):
        return (
            ProductDetailSerializer
            if self.action == "retrieve"
            else ProductListSerializer
        )

    def get_queryset(self):
        qs = (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images")
            .annotate(
                effective_price_db=Coalesce(
                    "discount_price",
                    "price",
                )
            )
        )

        p = self.request.query_params

        if p.get("category", "").isdigit():
            cid = int(p["category"])
            qs = qs.filter(
                Q(category_id=cid) |
                Q(category__parent_id=cid)
            )

        if (low := _decimal(p.get("min_price"))) is not None:
            qs = qs.filter(effective_price_db__gte=low)

        if (high := _decimal(p.get("max_price"))) is not None:
            qs = qs.filter(effective_price_db__lte=high)

        if p.get("in_stock") == "true":
            qs = qs.filter(stock__gt=0)

        if p.get("featured") == "true":
            qs = qs.filter(is_featured=True)

        return qs


class BannerListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = BannerSerializer
    pagination_class = None
    queryset = Banner.objects.filter(is_active=True)
