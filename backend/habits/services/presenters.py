from __future__ import annotations

from django.contrib.auth.models import User

from ..models import Goal
from ..types import GoalData, ProfileData


def goal_data(goal: Goal) -> GoalData:
    return {
        "id": goal.id,
        "title": goal.title,
        "unit": goal.unit,
        "target": goal.target,
        "current": goal.current,
        "deadline": goal.deadline.isoformat() if goal.deadline else None,
    }


def profile_data(user: User) -> ProfileData:
    return {
        "username": user.username,
        "first_name": user.first_name,
        "email": user.email,
        "joined": user.date_joined.date().isoformat(),
    }
