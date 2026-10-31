from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from orders.models import Order, OrderStatus
from orders.services import cancel_order


class Command(BaseCommand):
    help = "Cancel online-payment orders left unpaid for N minutes and give their stock back. Run it from cron every few minutes."

    def add_arguments(self, parser):
        parser.add_argument("--minutes", type=int, default=30)

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(minutes=opts["minutes"])
        ids = list(Order.objects.filter(status=OrderStatus.PENDING_PAYMENT, created_at__lt=cutoff).values_list("pk", flat=True))
        for pk in ids:
            cancel_order(pk, note="Payment not completed in time")
        self.stdout.write(self.style.SUCCESS(f"Expired {len(ids)} unpaid order(s)."))
