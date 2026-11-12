from __future__ import annotations

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from ..services.presenters import profile_data
from ..services.validation import password_errors
from ..types import FieldErrors
from .common import authenticated_user, payload


@api_view(["GET", "PATCH"])
def profile(request: Request) -> Response:
    import re

    from django.core.validators import validate_email

    if request.method == "GET":
        return Response(profile_data(authenticated_user(request)))
    data = payload(request)
    errors: FieldErrors = {}
    name = data.get("username", authenticated_user(request).username)
    first_name = data.get("first_name", authenticated_user(request).first_name)
    email = data.get("email", authenticated_user(request).email)
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_]{3,30}", name.strip()):
        errors["username"] = [
            "От 3 до 30 символов: латинские буквы, цифры и подчёркивание."
        ]
    elif (
        User.objects.filter(username__iexact=name.strip())
        .exclude(pk=authenticated_user(request).pk)
        .exists()
    ):
        errors["username"] = ["Это имя пользователя уже занято."]
    if not isinstance(first_name, str) or len(first_name.strip()) > 80:
        errors["first_name"] = ["Имя должно быть не длиннее 80 символов."]
    if not isinstance(email, str) or len(email.strip()) > 254:
        errors["email"] = ["Введите корректный адрес почты."]
    elif email.strip():
        try:
            validate_email(email.strip())
        except ValidationError:
            errors["email"] = ["Введите корректный адрес почты."]
    if errors:
        return Response({"errors": errors}, status=400)
    try:
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=authenticated_user(request).pk)
            user.username = name.strip()
            user.first_name = first_name.strip()
            user.email = email.strip()
            user.save(update_fields=["username", "first_name", "email"])
    except IntegrityError:
        return Response(
            {"errors": {"username": ["Это имя пользователя уже занято."]}}, status=400
        )
    return Response(profile_data(user))


@api_view(["POST"])
def change_password(request: Request) -> Response:
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=authenticated_user(request).pk)
        current = payload(request).get("current_password", "")
        password = payload(request).get("password", "")
        errors: FieldErrors = {}
        if not isinstance(current, str) or not user.check_password(current):
            errors["current_password"] = ["Текущий пароль указан неверно."]
        rules = password_errors(password, user)
        if rules:
            errors["password"] = rules
        elif isinstance(current, str) and current == password:
            errors["password"] = ["Новый пароль должен отличаться от текущего."]
        if payload(request).get("password_confirm") != password:
            errors["password_confirm"] = ["Пароли не совпадают."]
        if errors:
            return Response({"errors": errors}, status=400)
        user.set_password(password)
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()
        token = Token.objects.create(user=user)
    return Response({**profile_data(user), "token": token.key})
