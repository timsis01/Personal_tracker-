from django.urls import path

from habits.views import (
    auth,
    change_password,
    complete,
    goals,
    habit_detail,
    habits,
    health,
    profile,
)

urlpatterns = [
    path("api/health/", health),
    path("api/profile/", profile),
    path("api/profile/password/", change_password),
    path("api/goals/", goals),
    path("api/goals/<int:pk>/", goals),
    path("api/habits/<int:pk>/", habit_detail),
    path("api/auth/", auth),
    path("api/habits/", habits),
    path("api/habits/<int:pk>/complete/", complete),
]
