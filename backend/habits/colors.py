from django.contrib.auth.models import User

PALETTE = [
    "#5274cc",
    "#d18a42",
    "#399b7a",
    "#c96859",
    "#9671ba",
    "#428db5",
    "#c45f7f",
    "#778b51",
    "#a77855",
    "#5b9b9c",
    "#8a7bb5",
    "#aa8c37",
    "#637f98",
    "#bc7665",
    "#6c975d",
    "#aa6da3",
]


def next_color(user: User) -> str:
    from .models import Habit

    used = set(Habit.objects.filter(user=user).values_list("color", flat=True))
    return next((c for c in PALETTE if c not in used), PALETTE[len(used) % len(PALETTE)])
