"""Read-only legacy settings used exclusively by the SQLite import command."""

import os
from pathlib import Path

from .settings import *  # noqa: F403

source = Path(os.environ["LEGACY_SQLITE_PATH"]).resolve()
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": f"{source.as_uri()}?mode=ro",
        "OPTIONS": {"uri": True},
    }
}
