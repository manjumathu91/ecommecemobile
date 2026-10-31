from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import AIChatSerializer
from .services import get_ai_response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_chat(request):

    serializer = AIChatSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    message = serializer.validated_data["message"]

    result = get_ai_response(
        message=message,
        user=request.user
    )

    return Response({
        "success": True,
        "reply": result["reply"]
    })