from rest_framework import serializers

from .models import Banner, Product, ProductImage


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("id", "image", "alt_text")


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id", "name", "slug", "category", "category_name", "price", "discount_price",
            "effective_price", "discount_percent", "stock", "in_stock", "is_low_stock",
            "avg_rating", "review_count", "thumbnail",
        )

    def get_thumbnail(self, obj):
        first = next(iter(obj.images.all()), None)
        if not first:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(first.image.url) if request else first.image.url


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    related = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ("description", "images", "related")

    def get_related(self, obj):
        qs = (
            Product.objects.filter(category=obj.category, is_active=True)
            .exclude(pk=obj.pk)
            .select_related("category")
            .prefetch_related("images")[:8]
        )
        return ProductListSerializer(qs, many=True, context=self.context).data


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ("id", "title", "image", "product", "category")
