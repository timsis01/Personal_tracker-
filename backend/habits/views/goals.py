from __future__ import annotations

from datetime import date

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Goal
from ..services.presenters import goal_data
from ..types import FieldErrors
from .common import authenticated_user, payload


@api_view(["GET", "POST", "PATCH", "DELETE"])
def goals(request: Request, pk: int | None = None) -> Response:
    import math

    if pk is None and request.method == "GET":
        return Response(
            [
                goal_data(goal)
                for goal in Goal.objects.filter(
                    user=authenticated_user(request)
                ).order_by("id")
            ]
        )
    if pk is None and request.method != "POST":
        return Response(status=405)
    if pk is not None:
        try:
            goal = Goal.objects.get(pk=pk, user=authenticated_user(request))
        except Goal.DoesNotExist:
            return Response(status=404)
        if request.method == "DELETE":
            goal.delete()
            return Response(status=204)
        if request.method != "PATCH":
            return Response(status=405)
    else:
        goal = Goal(user=authenticated_user(request))
    errors: FieldErrors = {}
    for key, limit in [("title", 120), ("unit", 20)]:
        value = payload(request).get(key, getattr(goal, key))
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= limit:
            errors[key] = ["Заполните поле корректно."]
        else:
            setattr(goal, key, value.strip())
    for key in ["target", "current"]:
        value = payload(request).get(key, getattr(goal, key))
        try:
            if isinstance(value, bool):
                raise ValueError()
            value = float(value)
            if not math.isfinite(value) or value < 0 or (key == "target" and value == 0):
                raise ValueError()
            setattr(goal, key, value)
        except (TypeError, ValueError):
            errors[key] = [
                "Введите положительное число."
                if key == "target"
                else "Введите число не меньше нуля."
            ]
    if "deadline" in payload(request):
        try:
            goal.deadline = (
                date.fromisoformat(payload(request)["deadline"])
                if payload(request)["deadline"]
                else None
            )
        except (TypeError, ValueError):
            errors["deadline"] = ["Некорректная дата."]
    if errors:
        return Response({"errors": errors}, status=400)
    goal.save()
    return Response(goal_data(goal), status=201 if pk is None else 200)
