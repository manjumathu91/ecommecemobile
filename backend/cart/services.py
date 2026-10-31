from django.db import transaction
from rest_framework.exceptions import ValidationError

from products.models import Product

from .models import Cart, CartItem


def get_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def _lock_product(product_id):
    try:
        return Product.objects.select_for_update().get(pk=product_id, is_active=True)
    except Product.DoesNotExist:
        raise ValidationError({"product_id": "Product not found or unavailable."})


@transaction.atomic
def add_item(user, product_id, quantity):
    product = _lock_product(product_id)
    cart = get_cart(user)
    item = CartItem.objects.filter(cart=cart, product=product).first()
    new_qty = (item.quantity if item else 0) + quantity
    if new_qty > product.stock:
        raise ValidationError({"quantity": f"Only {product.stock} unit(s) of '{product.name}' in stock."})
    if item:
        item.quantity = new_qty
        item.save(update_fields=["quantity"])
    else:
        CartItem.objects.create(cart=cart, product=product, quantity=new_qty)
    return cart


@transaction.atomic
def set_quantity(user, product_id, quantity):
    product = _lock_product(product_id)
    cart = get_cart(user)
    item = CartItem.objects.filter(cart=cart, product=product).first()
    if not item:
        raise ValidationError({"product_id": "Item is not in your cart."})
    if quantity > product.stock:
        raise ValidationError({"quantity": f"Only {product.stock} unit(s) of '{product.name}' in stock."})
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    return cart


@transaction.atomic
def remove_item(user, product_id):
    cart = get_cart(user)
    CartItem.objects.filter(cart=cart, product_id=product_id).delete()
    return cart


@transaction.atomic
def merge_guest_cart(user, items):
    """Merge a guest (on-device) cart into the MySQL cart after login.
    Quantities are capped at available stock; anything adjusted is reported back."""
    cart = get_cart(user)
    adjustments = []
    for entry in items:
        try:
            product = Product.objects.select_for_update().get(pk=entry["product_id"], is_active=True)
        except Product.DoesNotExist:
            adjustments.append({"product_id": entry["product_id"], "reason": "unavailable"})
            continue
        existing = CartItem.objects.filter(cart=cart, product=product).first()
        wanted = (existing.quantity if existing else 0) + entry["quantity"]
        final = min(wanted, product.stock)
        if final < 1:
            adjustments.append({"product_id": product.id, "reason": "out_of_stock"})
            continue
        if final < wanted:
            adjustments.append({"product_id": product.id, "reason": "capped_to_stock", "quantity": final})
        if existing:
            existing.quantity = final
            existing.save(update_fields=["quantity"])
        else:
            CartItem.objects.create(cart=cart, product=product, quantity=final)
    return cart, adjustments
@transaction.atomic
def remove_ordered_items_from_cart(order):
    """
    Remove only the quantities purchased in this order.
    Preserve any additional quantities added while payment was pending.
    """
    cart = Cart.objects.select_for_update().filter(
        user_id=order.user_id
    ).first()

    if cart is None:
        return

    for ordered_item in order.items.all():
        if ordered_item.product_id is None:
            continue

        cart_item = CartItem.objects.select_for_update().filter(
            cart=cart,
            product_id=ordered_item.product_id,
        ).first()

        if cart_item is None:
            continue

        remaining = cart_item.quantity - ordered_item.quantity

        if remaining > 0:
            cart_item.quantity = remaining
            cart_item.save(update_fields=["quantity"])
        else:
            cart_item.delete()