
from django.contrib import admin
from .models import Wishlist, WishlistItem
from core.admin_site import shop_admin_site

shop_admin_site.register(Wishlist)
shop_admin_site.register(WishlistItem)