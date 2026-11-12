from __future__ import annotations

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from ..services.validation import password_errors
from ..types import FieldErrors
from .common import payload


@api_view(["POST"])
@permission_classes([AllowAny])
def auth(request: Request) -> Response:
    import re

    name = payload(request).get("username", "")
    password = payload(request).get("password", "")
    if not isinstance(name, str) or not isinstance(password, str):
        return Response({"error": "Некорректные данные формы"}, status=400)
    name = name.strip()
    if payload(request).get("register") is True:
        errors: FieldErrors = {}
        if not re.fullmatch(r"[A-Za-z0-9_]{3,30}", name):
            errors["username"] = [
                "От 3 до 30 символов: латинские буквы, цифры и подчёркивание."
            ]
        rules = password_errors(password, User(username=name))
        if rules:
            errors["password"] = rules
        if payload(request).get("password_confirm") != password:
            errors["password_confirm"] = ["Пароли не совпадают."]
        if errors:
            return Response({"errors": errors}, status=400)
        try:
            with transaction.atomic():
                User.objects.create_user(username=name, password=password)
        except IntegrityError:
            return Response(
                {"errors": {"username": ["Это имя уже занято. Выберите другое."]}},
                status=400,
            )
    user = authenticate(username=name, password=password)
    if not user:
        return Response({"error": "Неверное имя пользователя или пароль."}, status=400)
    return Response(
        {
            "token": Token.objects.get_or_create(user=user)[0].key,
            "username": user.username,
        }
    )
