from .models import StockMovement


def log_stock(product, change, reason, order=None):
    """Call AFTER product.stock has been updated."""
    StockMovement.objects.create(product=product, change=change, stock_after=product.stock, reason=reason, order=order)
