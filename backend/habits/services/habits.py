from __future__ import annotations

from datetime import date, timedelta

from django.utils import timezone

from ..models import Habit
from ..types import HabitData


def scheduled(habit: Habit, day: date) -> bool:
    return day >= habit.start_date and day.weekday() in habit.weekdays


def serialize(habit: Habit) -> HabitData:
    today = timezone.localdate()
    records = list(habit.completions.all())
    dates = {r.date for r in records if r.status == "done"}
    cursor = today
    if today not in dates:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor >= habit.start_date:
        if scheduled(habit, cursor):
            if cursor not in dates:
                break
            streak += 1
        cursor -= timedelta(days=1)
    best = run = 0
    cursor = habit.start_date
    while cursor <= today:
        if scheduled(habit, cursor):
            run = run + 1 if cursor in dates else 0
            best = max(best, run)
        cursor += timedelta(days=1)
    return {
        "id": habit.id,
        "title": habit.title,
        "icon": habit.icon,
        "color": habit.color,
        "weekdays": habit.weekdays,
        "start_date": habit.start_date.isoformat(),
        "goal": habit.goal_id,
        "streak": streak,
        "best_streak": best,
        "done": today in dates,
        "dates": [d.isoformat() for d in sorted(dates)],
        "entries": {
            r.date.isoformat(): {"status": r.status, "note": r.note} for r in records
        },
    }
