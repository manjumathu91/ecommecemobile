from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Wrap every error in one consistent JSON shape:
    {"success": false, "error": {"code": <http status>, "message": str, "details": any}}"""
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    if isinstance(data, dict) and "detail" in data and len(data) == 1:
        message, details = str(data["detail"]), None
    else:
        message, details = "Validation failed" if response.status_code == 400 else "Request failed", data
    return Response(
        {"success": False, "error": {"code": response.status_code, "message": message, "details": details}},
        status=response.status_code,
    )
