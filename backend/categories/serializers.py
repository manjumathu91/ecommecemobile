from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "image", "parent", "children")

    def get_children(self, obj):
        kids = [c for c in obj.children.all() if c.is_active]
        return CategorySerializer(kids, many=True, context=self.context).data
