

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.validators import RegexValidator

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


# ======================================================
# PHONE VALIDATION
# ======================================================

phone_validator = RegexValidator(
    regex=r"^\+?\d{10,14}$",
    message="Enter a valid phone number."
)


# ======================================================
# JWT TOKENS
# ======================================================

def tokens_for(user):
    refresh = RefreshToken.for_user(user)

    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


# ======================================================
# USER SERIALIZER
# ======================================================

class UserSerializer(serializers.ModelSerializer):

    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[phone_validator]
    )

    class Meta:
        model = User

        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "date_joined",
        )

        read_only_fields = (
            "id",
            "date_joined",
        )


# ======================================================
# REGISTER SERIALIZER
# ======================================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )

    phone = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[phone_validator]
    )

    class Meta:
        model = User

        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "phone",
        )

        extra_kwargs = {
            "first_name": {
                "required": True
            }
        }

    # ----------------------------------------------
    # DUPLICATE EMAIL VALIDATION
    # ----------------------------------------------

    def validate_email(self, value):

        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():

            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    # ----------------------------------------------
    # PASSWORD VALIDATION
    # ----------------------------------------------

    def validate(self, attrs):

        candidate = User(
            email=attrs["email"],
            first_name=attrs.get("first_name", "")
        )

        validate_password(
            attrs["password"],
            candidate
        )

        return attrs

    # ----------------------------------------------
    # CREATE UNVERIFIED USER
    # ----------------------------------------------

    def create(self, validated_data):

        # New registrations must verify their email.
        validated_data["email_verified"] = False

        return User.objects.create_user(
            **validated_data
        )


# ======================================================
# CHANGE PASSWORD SERIALIZER
# ======================================================

class ChangePasswordSerializer(serializers.Serializer):

    old_password = serializers.CharField(
        write_only=True
    )

    new_password = serializers.CharField(
        write_only=True
    )

    def validate_old_password(self, value):

        if not self.context["request"].user.check_password(value):

            raise serializers.ValidationError(
                "Current password is incorrect."
            )

        return value

    def validate_new_password(self, value):

        validate_password(
            value,
            self.context["request"].user
        )

        return value


# ======================================================
# FORGOT PASSWORD SERIALIZER
# ======================================================

class ForgotPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField()


# ======================================================
# RESET PASSWORD SERIALIZER
# ======================================================

class ResetPasswordSerializer(serializers.Serializer):

    uid = serializers.CharField()

    token = serializers.CharField()

    new_password = serializers.CharField(
        write_only=True
    )
