import json
import logging
import threading
import urllib.request

from django.db import transaction

from .models import DeviceToken, Notification

log = logging.getLogger(__name__)
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _send_push(tokens, title, message, data):
    try:
        body = json.dumps([{"to": t, "title": title, "body": message, "data": data} for t in tokens]).encode()
        req = urllib.request.Request(EXPO_PUSH_URL, body, {"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=5).read()
    except Exception:  # push is best-effort; the in-app notification is the source of truth
        log.warning("Expo push failed", exc_info=True)


def notify(user, title, message, type=Notification.SYSTEM, order=None):
    note = Notification.objects.create(user=user, title=title, message=message, type=type, order=order)
    tokens = list(DeviceToken.objects.filter(user=user).values_list("token", flat=True))
    if tokens:
        data = {"type": type, "order_id": order.pk if order else None}
        # only after the surrounding DB transaction commits, and never blocking the request
        transaction.on_commit(lambda: threading.Thread(target=_send_push, args=(tokens, title, message, data), daemon=True).start())
    return note
