

import binascii

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import (
    PasswordResetTokenGenerator,
    default_token_generator,
)
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)

from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    tokens_for,
)


User = get_user_model()


# ======================================================
# AUTH THROTTLING
# ======================================================

class AuthThrottleMixin:
    throttle_scope = "auth"


# ======================================================
# EMAIL VERIFICATION TOKEN
# ======================================================

class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):

    def _make_hash_value(self, user, timestamp):

        return (
            f"{user.pk}"
            f"{user.password}"
            f"{user.last_login}"
            f"{user.email}"
            f"{user.email_verified}"
            f"{timestamp}"
        )


email_verification_token = EmailVerificationTokenGenerator()


# ======================================================
# SEND EMAIL VERIFICATION LINK
# ======================================================

def send_verification_email(user):

    uid = urlsafe_base64_encode(
        force_bytes(user.pk)
    )

    token = email_verification_token.make_token(user)

    # Configure FRONTEND_URL in Django settings.
    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        "http://localhost:8081",
    )

    verification_url = (
        f"{frontend_url.rstrip('/')}"
        f"/verify-email?uid={uid}&token={token}"
    )

    subject = "Verify your VELORA email address"

    message = (
        f"Hello {user.first_name or 'Customer'},\n\n"
        "Welcome to VELORA!\n\n"
        "Please verify your email address by opening this link:\n\n"
        f"{verification_url}\n\n"
        "This verification link expires according to the configured "
        "password reset token timeout.\n\n"
        "If you did not create this account, please ignore this email.\n\n"
        "Thank you,\n"
        "VELORA Team"
    )

    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


# ======================================================
# CUSTOM LOGIN SERIALIZER
# Only verified users can receive JWT tokens.
# ======================================================

class VerifiedTokenObtainPairSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):

        credentials = {
            User.USERNAME_FIELD: attrs.get(User.USERNAME_FIELD),
            "password": attrs.get("password"),
        }

        user = authenticate(
            request=self.context.get("request"),
            **credentials,
        )

        if user is not None and not user.email_verified:

            raise AuthenticationFailed(
                "Please verify your email address before logging in.",
                code="email_not_verified",
            )

        return super().validate(attrs)


# ======================================================
# REGISTER VIEW
# ======================================================

class RegisterView(AuthThrottleMixin, generics.CreateAPIView):

    serializer_class = RegisterSerializer

    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        # Create user and send verification email together.
        # If email sending fails, the DB transaction rolls back.

        with transaction.atomic():

            user = serializer.save()

            send_verification_email(user)

        return Response(
            {
                "detail": (
                    "Registration successful. "
                    "Please check your email and verify your account."
                ),
                "email_verification_required": True,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ======================================================
# VERIFY EMAIL VIEW
# ======================================================

class VerifyEmailView(AuthThrottleMixin, APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        uid = request.data.get("uid")

        token = request.data.get("token")

        if not uid or not token:

            return Response(
                {
                    "detail": "Verification UID and token are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            user_id = force_str(
                urlsafe_base64_decode(uid)
            )

            user = User.objects.get(pk=user_id)

        except (
            User.DoesNotExist,
            ValueError,
            TypeError,
            OverflowError,
            binascii.Error,
        ):

            return Response(
                {
                    "detail": "Invalid verification link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.email_verified:

            return Response(
                {
                    "detail": "Email address is already verified."
                },
                status=status.HTTP_200_OK,
            )

        if not email_verification_token.check_token(
            user,
            token,
        ):

            return Response(
                {
                    "detail": "Invalid or expired verification link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.email_verified = True

        user.save(
            update_fields=["email_verified"]
        )

        return Response(
            {
                "detail": "Email verified successfully. You can now log in."
            },
            status=status.HTTP_200_OK,
        )


# ======================================================
# LOGIN VIEW
# ======================================================

class LoginView(AuthThrottleMixin, TokenObtainPairView):

    permission_classes = [AllowAny]

    serializer_class = VerifiedTokenObtainPairSerializer


# ======================================================
# REFRESH TOKEN VIEW
# ======================================================

class RefreshView(AuthThrottleMixin, TokenRefreshView):

    permission_classes = [AllowAny]


# ======================================================
# LOGOUT VIEW
# ======================================================

class LogoutView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        token = request.data.get("refresh")

        if not token:

            return Response(
                {
                    "detail": "Refresh token is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            RefreshToken(token).blacklist()

        except TokenError:

            return Response(
                {
                    "detail": "Invalid or expired token."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            status=status.HTTP_205_RESET_CONTENT
        )


# ======================================================
# PROFILE VIEW
# ======================================================

class ProfileView(generics.RetrieveUpdateAPIView):

    serializer_class = UserSerializer

    permission_classes = [IsAuthenticated]

    def get_object(self):

        return self.request.user


# ======================================================
# CHANGE PASSWORD VIEW
# ======================================================

class ChangePasswordView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(
            raise_exception=True
        )

        request.user.set_password(
            serializer.validated_data["new_password"]
        )

        request.user.save(
            update_fields=["password"]
        )

        return Response(
            {
                "detail": "Password updated."
            }
        )


# ======================================================
# FORGOT PASSWORD VIEW
# ======================================================

class ForgotPasswordView(AuthThrottleMixin, APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = ForgotPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"],
            is_active=True,
        ).first()

        if user:

            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            token = default_token_generator.make_token(user)

            send_mail(

                "Reset your password",

                (
                    "Use these values in the app to reset your password.\n"
                    f"uid: {uid}\n"
                    f"token: {token}"
                ),

                settings.DEFAULT_FROM_EMAIL,

                [user.email],

            )

        # Same response whether account exists or not.
        # This prevents account discovery.

        return Response(
            {
                "detail": (
                    "If the email exists, "
                    "a reset message has been sent."
                )
            }
        )


# ======================================================
# RESET PASSWORD VIEW
# ======================================================

class ResetPasswordView(AuthThrottleMixin, APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        serializer = ResetPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        data = serializer.validated_data

        try:

            user = User.objects.get(
                pk=force_str(
                    urlsafe_base64_decode(data["uid"])
                )
            )

        except (
            User.DoesNotExist,
            ValueError,
            TypeError,
            OverflowError,
            binascii.Error,
        ):

            return Response(
                {
                    "detail": "Invalid reset link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(
            user,
            data["token"],
        ):

            return Response(
                {
                    "detail": "Invalid or expired reset link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:

            validate_password(
                data["new_password"],
                user,
            )

        except DjangoValidationError as exc:

            return Response(
                {
                    "new_password": list(exc.messages)
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(
            data["new_password"]
        )

        # A successful reset link proves access to this email.
        user.email_verified = True

        user.save(
            update_fields=[
                "password",
                "email_verified",
            ]
        )

        return Response(
            {
                "detail": "Password has been reset."
            }
        )
