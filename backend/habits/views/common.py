from typing import Any, cast

from django.contrib.auth.models import User
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request


def authenticated_user(request: Request) -> User:
    """All callers run behind DRF IsAuthenticated permission checks."""

    return cast(User, request.user)


def payload(request: Request) -> dict[str, Any]:
    """Reject non-object JSON before individual field validation."""

    data = request.data

    if not isinstance(data, dict):
        raise ValidationError({"error": "Ожидается JSON-объект."})

    return data
