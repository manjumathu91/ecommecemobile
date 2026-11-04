from collections import OrderedDict
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Sum
from django.utils import timezone

from orders.models import Order, OrderItem, OrderStatus, PaymentStatus
from categories.models import Category
from products.models import Product

IN_PROGRESS = [OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY]
ZERO = Decimal("0")


def _bars(buckets):
    top = max((b["amount"] for b in buckets), default=ZERO) or Decimal("1")
    for b in buckets:
        b["pct"] = int(b["amount"] / top * 100)
    return buckets


def _bucket_sales(rows, keyfunc, keys):
    """Bucket (datetime, amount) rows in Python so no MySQL time-zone tables are needed."""
    data = OrderedDict((k, {"label": label, "orders": 0, "amount": ZERO}) for k, label in keys)
    for created, amount in rows:
        k = keyfunc(timezone.localtime(created).date())
        if k in data:
            data[k]["orders"] += 1
            data[k]["amount"] += amount
    return _bars(list(data.values()))


def dashboard_context():
    """'Sales' = every order that was actually placed (not cancelled, not awaiting payment).
    'Revenue' = orders whose payment has been received (online payments + delivered COD)."""
    today = timezone.localdate()
    placed = Order.objects.exclude(status__in=[OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT])
    money = lambda qs: qs.aggregate(s=Sum("total_amount"))["s"] or ZERO

    rows = list(placed.filter(created_at__gte=timezone.now() - timedelta(days=190)).values_list("created_at", "total_amount"))
    days = [(today - timedelta(days=i)) for i in range(13, -1, -1)]
    monday = today - timedelta(days=today.weekday())
    weeks = [(monday - timedelta(weeks=i)) for i in range(7, -1, -1)]
    months, y, m = [], today.year, today.month
    for _ in range(6):
        months.insert(0, (y, m))
        y, m = (y, m - 1) if m > 1 else (y - 1, 12)

    low = Product.objects.filter(is_active=True, stock__lte=F("low_stock_threshold"))
    return {"stats": {
        "total_sales": money(placed),
        "total_revenue": money(Order.objects.filter(payment_status=PaymentStatus.PAID)),
        "total_orders": placed.count(),
        "pending_orders": Order.objects.filter(status__in=IN_PROGRESS).count(),
        "completed_orders": Order.objects.filter(status=OrderStatus.DELIVERED).count(),
        "cancelled_orders": Order.objects.filter(status=OrderStatus.CANCELLED).count(),
        "refunds_pending": Order.objects.filter(payment_status=PaymentStatus.REFUND_PENDING).count(),
        "processing_orders": Order.objects.filter(status__in=[OrderStatus.CONFIRMED, OrderStatus.PROCESSING]).count(),
        "shipped_orders": Order.objects.filter(status__in=[OrderStatus.SHIPPED, OrderStatus.OUT_FOR_DELIVERY]).count(),
        "categories": Category.objects.count(),
        "recent_customers": get_user_model().objects.filter(is_staff=False).order_by("-date_joined")[:5],
        "customers": get_user_model().objects.filter(is_staff=False).count(),
        "products": Product.objects.count(),
        "low_stock_count": low.count(),
        "low_stock": low.order_by("stock")[:10],
        "recent_orders": Order.objects.select_related("user")[:10],
        "daily": _bucket_sales(rows, lambda d: d, [(d, d.strftime("%d %b")) for d in days]),
        "weekly": _bucket_sales(rows, lambda d: d - timedelta(days=d.weekday()), [(w, "Week of " + w.strftime("%d %b")) for w in weeks]),
        "monthly": _bucket_sales(rows, lambda d: (d.year, d.month), [((y, m), f"{y}-{m:02d}") for y, m in months]),
        "best_sellers": list(
            OrderItem.objects.exclude(order__status__in=[OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT])
            .values("product_name").annotate(qty=Sum("quantity"), revenue=Sum("line_total")).order_by("-qty")[:5]
        ),
    }}
