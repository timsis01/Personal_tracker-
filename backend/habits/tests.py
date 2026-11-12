from datetime import date, timedelta
from typing import Any
from unittest.mock import patch

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIClient, APITestCase

from .models import Completion, Goal, Habit
from .views import serialize


class RegistrationTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.payload: dict[str, Any] = {
            "username": "test_reader",
            "password": "StrongPass42!",
            "password_confirm": "StrongPass42!",
            "register": True,
        }

    def register(self, **kwargs: Any) -> Response:
        return self.client.post("/api/auth/", self.payload | kwargs, format="json")

    def test_registration_and_login(self) -> None:
        result = self.register()
        self.assertEqual(result.status_code, 200)
        self.assertTrue(
            User.objects.get(username="test_reader").check_password(
                self.payload["password"]
            )
        )
        login = self.client.post(
            "/api/auth/",
            {"username": "test_reader", "password": self.payload["password"]},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

    def test_password_rules_on_server(self) -> None:
        for password in [
            "Abc123",
            "Пароль123A",
            "strongpass42",
            "STRONGPASS42",
            "StrongPassword",
            "Strong Pass42",
            "StrongPass42🙂",
            "A1" + "x" * 127,
        ]:
            with self.subTest(password=password):
                result = self.register(password=password, password_confirm=password)
                self.assertEqual(result.status_code, 400)
                self.assertIn("password", result.data["errors"])
        self.assertEqual(User.objects.count(), 0)

    def test_confirmation_required_and_matching(self) -> None:
        for confirmation in ["", None, "Different42"]:
            with self.subTest(confirmation=confirmation):
                self.assertIn(
                    "password_confirm",
                    self.register(password_confirm=confirmation).data["errors"],
                )
        self.assertEqual(User.objects.count(), 0)

    def test_invalid_username(self) -> None:
        for name in ["ab", "Имя", "hello world", "<script>", "x" * 31]:
            self.assertIn("username", self.register(username=name).data["errors"])

    def test_duplicate_username(self) -> None:
        self.register()
        self.assertIn("username", self.register().data["errors"])

    def test_similar_password(self) -> None:
        password = "Test_reader42"
        self.assertIn(
            "password",
            self.register(password=password, password_confirm=password).data["errors"],
        )

    def test_invalid_login(self) -> None:
        result = self.client.post(
            "/api/auth/", {"username": "missing", "password": "Wrong42"}, format="json"
        )
        self.assertEqual(result.status_code, 400)


class HabitTests(APITestCase):
    def setUp(self) -> None:
        self.client = APIClient()
        self.user = User.objects.create_user(username="reader", password="StrongPass42")
        self.client.force_authenticate(self.user)

    def test_creation_validation(self) -> None:
        for title in ["", "  ", "a", "x" * 121, 123]:
            self.assertEqual(
                self.client.post(
                    "/api/habits/", {"title": title}, format="json"
                ).status_code,
                400,
            )
        self.assertEqual(
            self.client.post(
                "/api/habits/", {"title": "Read daily", "icon": "bogus"}, format="json"
            ).status_code,
            400,
        )
        result = self.client.post(
            "/api/habits/", {"title": "Read daily", "icon": "learn"}, format="json"
        )
        self.assertEqual(result.status_code, 201)

    def test_complete_idempotent_and_private(self) -> None:
        habit = Habit.objects.create(user=self.user, title="Read")
        for _ in range(2):
            self.assertEqual(
                self.client.post(f"/api/habits/{habit.pk}/complete/").status_code, 200
            )
        self.assertEqual(Completion.objects.count(), 1)
        other = User.objects.create_user(username="other")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get("/api/habits/").data, [])
        self.assertEqual(
            self.client.post(f"/api/habits/{habit.pk}/complete/").status_code, 404
        )

    def test_streak_calendar_boundaries(self) -> None:
        habit = Habit.objects.create(user=self.user, title="Read")
        today = timezone.localdate()
        habit.start_date = today - timedelta(days=3)
        habit.save()
        for offset in [1, 2, 3]:
            Completion.objects.create(habit=habit, date=today - timedelta(days=offset))
        self.assertEqual(serialize(habit)["streak"], 3)
        Completion.objects.create(habit=habit, date=today)
        self.assertEqual(serialize(habit)["streak"], 4)
        with patch(
            "habits.views.timezone.localdate", return_value=today + timedelta(days=2)
        ):
            self.assertEqual(serialize(habit)["streak"], 0)

    def test_delete_own_habit_and_history(self) -> None:
        habit = Habit.objects.create(user=self.user, title="Disposable test habit")
        Completion.objects.create(habit=habit, date=timezone.localdate())
        keep = Habit.objects.create(user=self.user, title="Keep this habit")
        result = self.client.delete(f"/api/habits/{habit.pk}/")
        self.assertEqual(result.status_code, 204)
        self.assertFalse(Habit.objects.filter(pk=habit.pk).exists())
        self.assertFalse(Completion.objects.filter(habit_id=habit.pk).exists())
        self.assertTrue(Habit.objects.filter(pk=keep.pk).exists())
        self.assertEqual(
            [h["id"] for h in self.client.get("/api/habits/").data], [keep.pk]
        )
        self.assertEqual(self.client.delete(f"/api/habits/{habit.pk}/").status_code, 404)

    def test_cannot_delete_other_users_habit(self) -> None:
        other = User.objects.create_user(username="other_owner")
        habit = Habit.objects.create(user=other, title="Private")
        Completion.objects.create(habit=habit, date=timezone.localdate())
        self.assertEqual(self.client.delete(f"/api/habits/{habit.pk}/").status_code, 404)
        self.assertTrue(Habit.objects.filter(pk=habit.pk).exists())
        self.assertEqual(Completion.objects.filter(habit=habit).count(), 1)

    def test_delete_requires_authentication(self) -> None:
        habit = Habit.objects.create(user=self.user, title="Private")
        self.client = APIClient()
        self.assertEqual(self.client.delete(f"/api/habits/{habit.pk}/").status_code, 401)
        self.assertTrue(Habit.objects.filter(pk=habit.pk).exists())


class CalendarTests(APITestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(username="calendar")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.today = timezone.localdate()
        self.habit = Habit.objects.create(
            user=self.user, title="Read", start_date=self.today - timedelta(days=14)
        )

    def mark(self, day: date, status: str = "done", note: str = "") -> Response:
        return self.client.post(
            f"/api/habits/{self.habit.pk}/complete/",
            {"date": day.isoformat(), "status": status, "note": note},
            format="json",
        )

    def test_mark_edit_clear_and_notes(self) -> None:
        yesterday = self.today - timedelta(days=1)
        self.assertEqual(self.mark(yesterday, note="Chapter one").status_code, 200)
        self.assertEqual(self.mark(yesterday, "missed", "No time").status_code, 200)
        self.assertEqual(Completion.objects.get().note, "No time")
        self.assertNotIn(yesterday.isoformat(), serialize(self.habit)["dates"])
        self.assertEqual(self.mark(yesterday, "clear").status_code, 200)
        self.assertEqual(Completion.objects.count(), 0)

    def test_future_unscheduled_and_prestart_rejected(self) -> None:
        self.assertEqual(self.mark(self.today + timedelta(days=1)).status_code, 400)
        self.assertEqual(self.mark(self.today - timedelta(days=15)).status_code, 400)
        self.habit.weekdays = [(self.today.weekday() + 1) % 7]
        self.habit.save()
        self.assertEqual(self.mark(self.today).status_code, 400)

    def test_edit_schedule_and_ownership(self) -> None:
        url = f"/api/habits/{self.habit.pk}/"
        self.assertEqual(
            self.client.patch(url, {"weekdays": []}, format="json").status_code, 400
        )
        self.assertEqual(
            self.client.patch(
                url, {"title": "New title", "weekdays": [0, 2, 4]}, format="json"
            ).status_code,
            200,
        )
        other = User.objects.create_user(username="calendar_other")
        self.client.force_authenticate(other)
        self.assertEqual(
            self.client.patch(url, {"title": "Stolen"}, format="json").status_code, 404
        )

    def test_rest_days_do_not_break_series(self) -> None:
        days = [self.today - timedelta(days=i) for i in range(10)]
        chosen = [d for d in days if d.weekday() in [0, 2, 4]]
        self.habit.weekdays = [0, 2, 4]
        self.habit.start_date = min(chosen)
        self.habit.save()
        for d in chosen:
            Completion.objects.create(habit=self.habit, date=d)
        self.assertEqual(serialize(self.habit)["streak"], len(chosen))
        self.assertEqual(serialize(self.habit)["best_streak"], len(chosen))

    def test_goals_and_link_cleanup(self) -> None:
        r = self.client.post(
            "/api/goals/",
            {"title": "Read books", "target": 12, "current": 2, "unit": "books"},
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        gid = r.data["id"]
        self.assertEqual(
            self.client.patch(
                f"/api/habits/{self.habit.pk}/", {"goal": gid}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.patch(f"/api/goals/{gid}/", {"current": 5}, format="json").data[
                "current"
            ],
            5,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/goals/{gid}/", {"target": 0}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/goals/{gid}/", {"current": "NaN"}, format="json"
            ).status_code,
            400,
        )
        self.client.delete(f"/api/goals/{gid}/")
        self.habit.refresh_from_db()
        self.assertIsNone(self.habit.goal_id)

    def test_foreign_goal_is_private(self) -> None:
        other = User.objects.create_user(username="goal_owner")
        goal = Goal.objects.create(user=other, title="Private")
        self.assertEqual(self.client.get("/api/goals/").data, [])
        self.assertEqual(
            self.client.patch(
                f"/api/goals/{goal.pk}/", {"current": 5}, format="json"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/habits/{self.habit.pk}/", {"goal": goal.pk}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(self.client.delete(f"/api/goals/{goal.pk}/").status_code, 404)

    def test_all_habits_includes_sport_on_its_rest_day(self) -> None:
        from datetime import date

        self.habit.title = "Спорт"
        self.habit.start_date = date(2026, 11, 1)
        self.habit.weekdays = [0, 1, 2, 4, 5, 6]
        self.habit.save()
        with patch("habits.views.timezone.localdate", return_value=date(2026, 11, 12)):
            response = self.client.get("/api/habits/")
            sport = next(h for h in response.data if h["id"] == self.habit.pk)
            self.assertEqual(sport["title"], "Спорт")
            self.assertEqual(sport["weekdays"], [0, 1, 2, 4, 5, 6])
            self.assertEqual(self.mark(date(2026, 11, 12)).status_code, 400)
        with patch("habits.views.timezone.localdate", return_value=date(2026, 11, 13)):
            self.assertEqual(self.mark(date(2026, 11, 13)).status_code, 200)
        url = f"/api/habits/{self.habit.pk}/"
        self.assertEqual(
            self.client.patch(
                url, {"weekdays": [0, 1, 2, 3, 4, 5, 6]}, format="json"
            ).status_code,
            200,
        )
        saved = self.client.get("/api/habits/").data
        self.assertEqual(
            next(h for h in saved if h["id"] == self.habit.pk)["weekdays"],
            list(range(7)),
        )


class DemoAccountTests(APITestCase):
    def test_demo_data_and_existing_accounts_are_protected(self) -> None:
        from datetime import date
        from io import StringIO

        from django.core.management import CommandError, call_command

        with patch(
            "habits.management.commands.seed_demo.timezone.localdate",
            return_value=date(2026, 11, 12),
        ):
            call_command(
                "seed_demo",
                username="demo_test",
                password="November26!Run",
                month="2026-11",
                stdout=StringIO(),
            )
            user = User.objects.get(username="demo_test")
            self.assertTrue(user.check_password("November26!Run"))
            self.assertEqual(Habit.objects.filter(user=user).count(), 12)
            self.assertEqual(Goal.objects.filter(user=user).count(), 3)
            records = Completion.objects.filter(habit__user=user)
            self.assertTrue(records.filter(status="done").exists())
            self.assertTrue(records.filter(status="missed").exists())
            self.assertTrue(records.exclude(note="").exists())
            self.assertFalse(records.filter(date__gt=date(2026, 11, 12)).exists())
            self.assertFalse(records.filter(date__lt=date(2026, 11, 1)).exists())
            for entry in records.select_related("habit"):
                self.assertIn(entry.date.weekday(), entry.habit.weekdays)
            self.assertNotIn(3, Habit.objects.get(user=user, title="Спорт").weekdays)
            count = records.count()
            with self.assertRaises(CommandError):
                call_command(
                    "seed_demo",
                    username="demo_test",
                    password="OtherPassword",
                    month="2026-11",
                    stdout=StringIO(),
                )
            self.assertEqual(records.count(), count)
            user.refresh_from_db()
            self.assertTrue(user.check_password("November26!Run"))


class HabitColorTests(APITestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(username="colors")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_automatic_colors_differ_and_custom_color_persists(self) -> None:
        first = self.client.post(
            "/api/habits/", {"title": "Read books"}, format="json"
        ).data
        second = self.client.post(
            "/api/habits/", {"title": "Go running"}, format="json"
        ).data
        self.assertNotEqual(first["color"], second["color"])
        self.assertEqual(
            self.client.patch(
                f"/api/habits/{first['id']}/", {"color": "#c96859"}, format="json"
            ).status_code,
            200,
        )
        saved = self.client.get("/api/habits/").data
        self.assertEqual(
            next(h for h in saved if h["id"] == first["id"])["color"], "#c96859"
        )

    def test_invalid_color_cannot_be_saved(self) -> None:
        for color in ["red", "#123", "<script>", None, 12]:
            self.assertEqual(
                self.client.post(
                    "/api/habits/",
                    {"title": "A new habit", "color": color},
                    format="json",
                ).status_code,
                400,
            )


class ProfileTests(APITestCase):
    def setUp(self) -> None:
        from rest_framework.authtoken.models import Token

        self.user = User.objects.create_user(
            username="profile_reader", password="OldSecure42!", first_name="Иван"
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION="Token " + self.token.key)

    def test_get_and_update_profile_without_touching_history(self) -> None:
        habit = Habit.objects.create(user=self.user, title="Read every day")
        before = self.client.get("/api/profile/").data
        self.assertEqual(before["first_name"], "Иван")
        self.assertNotIn("password", before)
        result = self.client.patch(
            "/api/profile/",
            {
                "username": "new_reader",
                "first_name": "Алексей",
                "email": "alex@example.com",
                "is_staff": True,
            },
            format="json",
        )
        self.assertEqual(result.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "new_reader")
        self.assertEqual(self.user.email, "alex@example.com")
        self.assertFalse(self.user.is_staff)
        self.assertEqual(Habit.objects.get(pk=habit.pk).user_id, self.user.pk)
        self.assertEqual(self.client.get("/api/profile/").data["first_name"], "Алексей")
        login = APIClient().post(
            "/api/auth/",
            {"username": "new_reader", "password": "OldSecure42!"},
            format="json",
        )
        self.assertEqual(login.status_code, 200)

    def test_invalid_and_duplicate_profile_values(self) -> None:
        User.objects.create_user(username="occupied")
        for data, field in [
            ({"username": "OCCUPIED"}, "username"),
            ({"username": "кириллица"}, "username"),
            ({"email": "not-an-email"}, "email"),
            ({"first_name": "x" * 81}, "first_name"),
            ({"email": None}, "email"),
        ]:
            result = self.client.patch("/api/profile/", data, format="json")
            self.assertEqual(result.status_code, 400)
            self.assertIn(field, result.data["errors"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "profile_reader")

    def password_change(self, **updates: Any) -> Response:
        return self.client.post(
            "/api/profile/password/",
            {
                "current_password": "OldSecure42!",
                "password": "NewSecure73!",
                "password_confirm": "NewSecure73!",
                **updates,
            },
            format="json",
        )

    def test_password_change_rotates_token_and_changes_login(self) -> None:
        result = self.password_change()
        self.assertEqual(result.status_code, 200)
        self.assertNotEqual(result.data["token"], self.token.key)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecure73!"))
        self.assertFalse(self.user.check_password("OldSecure42!"))
        self.assertEqual(self.client.get("/api/profile/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Token " + result.data["token"])
        self.assertEqual(self.client.get("/api/profile/").status_code, 200)
        for password, status in [("OldSecure42!", 400), ("NewSecure73!", 200)]:
            self.assertEqual(
                APIClient()
                .post(
                    "/api/auth/",
                    {"username": "profile_reader", "password": password},
                    format="json",
                )
                .status_code,
                status,
            )

    def test_password_change_rejects_errors_without_changing_credentials(self) -> None:
        cases = [
            ({"current_password": "wrong"}, "current_password"),
            ({"password_confirm": "Different42!"}, "password_confirm"),
            ({"password": "Пароль123A", "password_confirm": "Пароль123A"}, "password"),
            ({"password": "short", "password_confirm": "short"}, "password"),
            (
                {"password": "OldSecure42!", "password_confirm": "OldSecure42!"},
                "password",
            ),
        ]
        for data, field in cases:
            result = self.password_change(**data)
            self.assertEqual(result.status_code, 400)
            self.assertIn(field, result.data["errors"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldSecure42!"))
        self.assertEqual(self.client.get("/api/profile/").status_code, 200)

    def test_anonymous_cannot_read_or_modify_profile(self) -> None:
        client = APIClient()
        self.assertEqual(client.get("/api/profile/").status_code, 401)
        self.assertEqual(
            client.patch(
                "/api/profile/", {"first_name": "Other"}, format="json"
            ).status_code,
            401,
        )
        self.assertEqual(
            client.post("/api/profile/password/", {}, format="json").status_code, 401
        )

    def test_profile_is_always_current_users_profile(self) -> None:
        other = User.objects.create_user(username="other_profile", first_name="Другой")
        result = self.client.patch(
            "/api/profile/", {"id": other.pk, "first_name": "Моё имя"}, format="json"
        )
        self.assertEqual(result.status_code, 200)
        other.refresh_from_db()
        self.assertEqual(other.first_name, "Другой")


class DatabaseMigrationTests(APITestCase):
    def test_runtime_and_health_use_postgresql(self) -> None:
        from django.db import connection

        self.assertEqual(connection.vendor, "postgresql")
        self.assertEqual(self.client.get("/api/health/").status_code, 200)

    def test_import_refuses_to_overwrite_existing_accounts(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        from django.core.management import CommandError, call_command

        user = User.objects.create_user(
            username="keep_import_user", password="KeepSafe72!"
        )
        with TemporaryDirectory() as directory:
            source = Path(directory) / "legacy.sqlite3"
            source.touch()
            with self.assertRaisesMessage(
                CommandError, "Destination contains application data"
            ):
                call_command("import_sqlite", source=source)
        user.refresh_from_db()
        self.assertTrue(user.check_password("KeepSafe72!"))
        self.assertEqual(User.objects.count(), 1)

    def test_json_array_is_rejected_before_field_access(self) -> None:
        self.assertEqual(
            self.client.post("/api/auth/", [], format="json").status_code, 400
        )
        user = User.objects.create_user(username="json_payload_user")
        self.client.force_authenticate(user)
        self.assertEqual(
            self.client.post("/api/habits/", [], format="json").status_code, 400
        )
        self.assertEqual(
            self.client.post("/api/goals/", [], format="json").status_code, 400
        )
        self.assertEqual(
            self.client.patch("/api/profile/", [], format="json").status_code, 400
        )
        self.assertEqual(
            self.client.post("/api/profile/password/", [], format="json").status_code, 400
        )
