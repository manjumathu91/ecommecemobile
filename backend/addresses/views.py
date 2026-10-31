from django.db import transaction
from rest_framework import viewsets

from .models import Address
from .serializers import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    """Every query is scoped to request.user, so users can never see or edit others' addresses."""

    serializer_class = AddressSerializer
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        mine = self.get_queryset()
        make_default = serializer.validated_data.get("is_default") or not mine.exists()
        if make_default:
            mine.update(is_default=False)
        serializer.save(user=self.request.user, is_default=make_default)

    @transaction.atomic
    def perform_update(self, serializer):
        if serializer.validated_data.get("is_default"):
            self.get_queryset().exclude(pk=serializer.instance.pk).update(is_default=False)
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        was_default = instance.is_default
        instance.delete()
        if was_default:
            nxt = self.get_queryset().first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=["is_default"])
