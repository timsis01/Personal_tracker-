from __future__ import annotations

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from ..models import Goal
from ..types import FieldErrors, JsonObject


def password_errors(password: object, user: User) -> list[str]:
    import re

    if not isinstance(password, str):
        return ["Введите пароль."]
    errors = []
    if not 8 <= len(password) <= 128:
        errors.append("От 8 до 128 символов.")
    if not re.fullmatch(r"[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};:,.?/~]+", password):
        errors.append(
            "Только латинские буквы, цифры и специальные символы, без пробелов."
        )
    if not re.search("[a-z]", password) or not re.search("[A-Z]", password):
        errors.append("Добавьте строчную и заглавную латинские буквы.")
    if not re.search("[0-9]", password):
        errors.append("Добавьте хотя бы одну цифру.")
    if not errors:
        try:
            validate_password(password, user=user)
        except ValidationError as e:
            errors.extend(e.messages)
    return errors


def habit_errors(data: JsonObject, user: User) -> FieldErrors:
    import re

    errors: FieldErrors = {}
    if "color" in data and (
        not isinstance(data["color"], str)
        or not re.fullmatch(r"#[0-9a-fA-F]{6}", data["color"])
    ):
        errors["color"] = ["Выберите корректный цвет."]
    if "title" in data and (
        not isinstance(data["title"], str) or not 3 <= len(data["title"].strip()) <= 120
    ):
        errors["title"] = ["Название: от 3 до 120 символов."]
    if "icon" in data and data["icon"] not in [
        "general",
        "health",
        "learn",
        "sport",
        "focus",
        "rest",
    ]:
        errors["icon"] = ["Выберите категорию из списка."]
    if "weekdays" in data:
        days = data["weekdays"]
        if (
            not isinstance(days, list)
            or not days
            or any(type(d) is not int or d not in range(7) for d in days)
            or len(set(days)) != len(days)
        ):
            errors["weekdays"] = ["Выберите хотя бы один день недели."]
    if data.get("goal") is not None:
        if (
            type(data["goal"]) is not int
            or not Goal.objects.filter(pk=data["goal"], user=user).exists()
        ):
            errors["goal"] = ["Цель не найдена."]
    return errors
