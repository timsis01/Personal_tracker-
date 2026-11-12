from typing import Any, TypedDict

JsonObject = dict[str, Any]  # Untrusted JSON boundary; validators narrow each value.
FieldErrors = dict[str, list[str]]


class EntryData(TypedDict):
    status: str
    note: str


class HabitData(TypedDict):
    id: int
    title: str
    icon: str
    color: str
    weekdays: list[int]
    start_date: str
    goal: int | None
    streak: int
    best_streak: int
    done: bool
    dates: list[str]
    entries: dict[str, EntryData]


class GoalData(TypedDict):
    id: int
    title: str
    unit: str
    target: float
    current: float
    deadline: str | None


class ProfileData(TypedDict):
    username: str
    first_name: str
    email: str
    joined: str
