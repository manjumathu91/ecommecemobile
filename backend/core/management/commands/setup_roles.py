from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

CATALOG = {"categories.category": "acdv", "products.product": "acdv", "products.productimage": "acdv", "products.banner": "acdv",
           "products.stockmovement": "v", "coupons.coupon": "acdv", "reviews.productreview": "vd"}
ORDERS = {"orders.order": "vc", "orders.orderitem": "v", "orders.orderstatushistory": "v", "payments.payment": "v",
          "accounts.user": "v", "notifications.notification": "v"}
SUPPORT = {"orders.order": "v", "orders.orderitem": "v", "accounts.user": "v", "payments.payment": "v"}
VERBS = {"a": "add", "c": "change", "d": "delete", "v": "view"}


class Command(BaseCommand):
    help = "Create the staff role groups: Catalog Manager, Order Manager, Support (read-only). Superusers have every permission."

    def handle(self, *args, **opts):
        for name, spec in {"Catalog Manager": CATALOG, "Order Manager": ORDERS, "Support (read-only)": SUPPORT}.items():
            group, _ = Group.objects.get_or_create(name=name)
            perms = []
            for label, letters in spec.items():
                app, model = label.split(".")
                for ch in letters:
                    perms += list(Permission.objects.filter(content_type__app_label=app, codename=f"{VERBS[ch]}_{model}"))
            group.permissions.set(perms)
            self.stdout.write(f"{name}: {len(perms)} permissions")
