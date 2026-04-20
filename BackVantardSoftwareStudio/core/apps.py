from __future__ import annotations

import sys
from pathlib import Path

from django.apps import AppConfig


_SKIP_COMMANDS = {"makemigrations", "migrate", "test", "shell", "dbshell", "squashmigrations"}


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        if _SKIP_COMMANDS.intersection(sys.argv):
            return

        try:
            _setup_db_user()
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "setup_db_user: no se pudo crear el usuario/permisos de BD "
                "(¿la conexión configurada tiene privilegio CREATE USER?): %s", exc
            )


def _setup_db_user():
    from django.conf import settings
    from django.db import connection

    base_dir = Path(getattr(settings, "BASE_DIR", Path.cwd())).resolve()
    sql_path = base_dir.parent / "BaseDeDatos" / "003_database_user_and_permissions.sql"

    if not sql_path.exists():
        return

    sql_text = sql_path.read_text(encoding="utf-8")
    lines = [
        l.strip()
        for l in sql_text.splitlines()
        if l.strip() and not l.strip().startswith("--")
    ]
    raw_stmts = [s.strip() for s in " ".join(lines).split(";") if s.strip()]

    with connection.cursor() as cursor:
        for stmt in raw_stmts:
            cursor.execute(stmt)
