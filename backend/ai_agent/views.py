import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import AIChatSerializer
from .services import get_ai_response

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_chat(request):
    serializer = AIChatSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = get_ai_response(message=serializer.validated_data["message"], user=request.user)
    except ValueError:
        # GROQ_API_KEY missing: tell the app, never leak configuration details
        logger.error("AI assistant is not configured (GROQ_API_KEY missing).")
        return Response(
            {"success": False, "error": "The AI assistant is currently unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("AI assistant request failed")
        return Response(
            {"success": False, "error": "The AI assistant could not answer right now. Please try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"success": True, "reply": result["reply"]})
