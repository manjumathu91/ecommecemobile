

from django import forms
from django.contrib import admin
from core.admin_site import shop_admin_site
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField

from .models import User
import logging

logger = logging.getLogger(__name__)

class CustomUserCreationForm(forms.ModelForm):
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput,
    )
    password2 = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput,
    )

    class Meta:
        model = User
        fields = ("email", "first_name", "last_name", "phone")

    def clean_password2(self):
        password1 = self.cleaned_data.get("password1")
        password2 = self.cleaned_data.get("password2")

        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("Passwords do not match.")

        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])

        if commit:
            user.save()
            self.save_m2m()

        return user


class CustomUserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField()

    class Meta:
        model = User
        fields = "__all__"


class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm
    model = User

    ordering = ("-date_joined",)

    list_display = (
        "email",
        "first_name",
        "last_name",
        "phone",
        "order_count",
        "is_active",
        "is_staff",
        "date_joined",
    )

    search_fields = ("email", "first_name", "last_name", "phone")
    list_filter = ("is_staff", "is_superuser", "is_active")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {
            "fields": ("first_name", "last_name", "phone", "email_verified")
        }),
        ("Permissions", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
        ("Dates", {"fields": ("last_login", "date_joined")}),
        ("Orders", {"fields": ("order_history",)}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "first_name",
                "last_name",
                "phone",
                "password1",
                "password2",
            ),
        }),
    )

    readonly_fields = ("last_login", "date_joined", "order_history")
    
    def get_queryset(self, request):
        from django.db.models import Count
        return super().get_queryset(request).annotate(_orders=Count("orders"))

    @admin.display(description="Orders", ordering="_orders")
    def order_count(self, obj):
        return obj._orders

    @admin.display(description="Customer order history")
    def order_history(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        if not obj.pk:
            return "-"
        url = reverse("shop_admin:orders_order_changelist") + f"?user__id__exact={obj.pk}"
        return format_html('<a href="{}">View {} order(s)</a>', url, obj.orders.count())

    def add_view(self, request, form_url="", extra_context=None):
        try:
            return super().add_view(request, form_url, extra_context)
        except Exception:
            logger.exception("VELORA ADMIN USER ADD ERROR")
            raise

    def changelist_view(self, request, extra_context=None):
        try:
            return super().changelist_view(request, extra_context)
        except Exception:
            logger.exception("VELORA ADMIN USER LIST ERROR")
            raise

shop_admin_site.register(User, CustomUserAdmin)