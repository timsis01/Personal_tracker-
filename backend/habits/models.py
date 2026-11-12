from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


def all_weekdays() -> list[int]:
    return list(range(7))


class Goal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    unit = models.CharField(max_length=20, default="раз")
    target = models.FloatField(default=10)
    current = models.FloatField(default=0)
    deadline = models.DateField(null=True, blank=True)


class Habit(models.Model):
    if TYPE_CHECKING:
        from django.db.models.fields.related_descriptors import RelatedManager

        completions: RelatedManager[Completion]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    icon = models.CharField(max_length=8, default="general")
    color = models.CharField(max_length=7, default="#5274cc")
    weekdays: models.JSONField[list[int], list[int]] = models.JSONField(
        default=all_weekdays
    )
    start_date = models.DateField(default=timezone.localdate)
    goal = models.ForeignKey(Goal, null=True, blank=True, on_delete=models.SET_NULL)


class Completion(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="completions")
    date = models.DateField()
    status = models.CharField(max_length=8, default="done")
    note = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["habit", "date"], name="one_completion_per_day"
            )
        ]
