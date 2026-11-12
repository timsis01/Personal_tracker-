from __future__ import annotations

from datetime import date

from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import Completion, Habit
from ..services.habits import scheduled, serialize
from ..services.validation import habit_errors
from .common import authenticated_user, payload


@api_view(["GET", "POST"])
def habits(request: Request) -> Response:
    if request.method == "POST":
        data = {"title": payload(request).get("title", ""), **payload(request)}
        errors = habit_errors(data, authenticated_user(request))
        if errors:
            return Response({"errors": errors}, status=400)
        from ..colors import next_color

        habit = Habit.objects.create(
            color=data.get("color", next_color(authenticated_user(request))),
            user=authenticated_user(request),
            title=data["title"].strip(),
            icon=data.get("icon", "general"),
            weekdays=data.get("weekdays", list(range(7))),
            goal_id=data.get("goal"),
        )
        return Response(serialize(habit), status=201)
    return Response(
        [
            serialize(habit)
            for habit in Habit.objects.filter(user=authenticated_user(request))
            .prefetch_related("completions")
            .order_by("id")
        ]
    )


@api_view(["PATCH", "DELETE"])
def habit_detail(request: Request, pk: int) -> Response:
    try:
        habit = Habit.objects.get(pk=pk, user=authenticated_user(request))
    except Habit.DoesNotExist:
        return Response({"error": "Привычка не найдена."}, status=404)
    if request.method == "DELETE":
        habit.delete()
        return Response(status=204)
    errors = habit_errors(payload(request), authenticated_user(request))
    if errors:
        return Response({"errors": errors}, status=400)
    for key in ["title", "icon", "color", "weekdays", "goal"]:
        if key in payload(request):
            value = payload(request)[key]
            setattr(
                habit,
                "goal_id" if key == "goal" else key,
                value.strip() if key == "title" else value,
            )
    habit.save()
    return Response(serialize(habit))


@api_view(["POST"])
def complete(request: Request, pk: int) -> Response:
    try:
        habit = Habit.objects.get(pk=pk, user=authenticated_user(request))
    except Habit.DoesNotExist:
        return Response(status=404)
    try:
        day = date.fromisoformat(
            payload(request).get("date", timezone.localdate().isoformat())
        )
    except (ValueError, TypeError):
        return Response({"error": "Некорректная дата."}, status=400)
    if day > timezone.localdate() or not scheduled(habit, day):
        return Response({"error": "Этот день недоступен для отметки."}, status=400)
    status = payload(request).get("status", "done")
    note = payload(request).get("note", "")
    if (
        status not in ["done", "missed", "clear"]
        or not isinstance(note, str)
        or len(note) > 500
    ):
        return Response(
            {"error": "Некорректная отметка или заметка длиннее 500 символов."},
            status=400,
        )
    if status == "clear":
        habit.completions.filter(date=day).delete()
    else:
        Completion.objects.update_or_create(
            habit=habit, date=day, defaults={"status": status, "note": note}
        )
    return Response(serialize(habit))
