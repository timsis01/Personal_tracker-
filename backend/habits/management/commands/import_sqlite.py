"""One-time, transactional import into an empty PostgreSQL database."""

from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from django.apps import apps
from django.contrib.auth.models import Group, User
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.core.management.color import no_style
from django.db import connection, transaction
from rest_framework.authtoken.models import Token

from habits.models import Completion, Goal, Habit

MODELS = ("auth.group", "auth.user", "authtoken.token", "habits")
TABLES = (
    "auth_group",
    "auth_user",
    "authtoken_token",
    "habits_goal",
    "habits_habit",
    "habits_completion",
)


def canonical_fixture(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = json.loads(path.read_text(encoding="utf-8"))
    return sorted(records, key=lambda record: (record["model"], str(record["pk"])))


class Command(BaseCommand):
    help = "Import a legacy SQLite database into empty PostgreSQL, preserving IDs, tokens, and password hashes."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--source", type=Path, required=True)

    def handle(self, *args: Any, **options: Any) -> None:
        source: Path = options["source"].resolve()
        if connection.vendor != "postgresql":
            raise CommandError("The destination must be PostgreSQL.")
        if not source.is_file():
            raise CommandError(f"SQLite source does not exist: {source}")
        if any(
            model.objects.exists()
            for model in (User, Group, Token, Habit, Goal, Completion)
        ):
            raise CommandError(
                "Destination contains application data. Import refused; nothing changed."
            )
        with sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True) as legacy:
            expected = {
                table: legacy.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                for table in TABLES
            }
        with TemporaryDirectory(prefix="tracker-import-") as temporary:
            fixture = Path(temporary) / "legacy.json"
            env = {
                **os.environ,
                "LEGACY_SQLITE_PATH": str(source),
                "PYTHONUTF8": "1",
                "PYTHONIOENCODING": "utf-8",
            }
            subprocess.run(
                [
                    sys.executable,
                    "manage.py",
                    "dumpdata",
                    *MODELS,
                    "--natural-foreign",
                    "--settings=config.sqlite_export",
                    "--output",
                    str(fixture),
                ],
                check=True,
                env=env,
            )
            with transaction.atomic():
                call_command("loaddata", str(fixture), verbosity=0)
                with connection.cursor() as cursor:
                    for table in TABLES:
                        cursor.execute(
                            f"SELECT COUNT(*) FROM {connection.ops.quote_name(table)}"
                        )
                        result = cursor.fetchone()
                        if result is None or result[0] != expected[table]:
                            raise CommandError(
                                f"Row count mismatch in {table}; import rolled back."
                            )
                    for sql in connection.ops.sequence_reset_sql(
                        no_style(), list(apps.get_models())
                    ):
                        cursor.execute(sql)
                exported = Path(temporary) / "postgres.json"
                with exported.open("w", encoding="utf-8") as output:
                    call_command(
                        "dumpdata",
                        *MODELS,
                        natural_foreign=True,
                        stdout=output,
                        verbosity=0,
                    )
                if canonical_fixture(fixture) != canonical_fixture(exported):
                    raise CommandError(
                        "Imported field values differ from the source; import rolled back."
                    )
        self.stdout.write(
            self.style.SUCCESS(
                "Import verified: every exported record and field matches SQLite."
            )
        )
        for table, count in expected.items():
            self.stdout.write(f"{table}: {count}")
