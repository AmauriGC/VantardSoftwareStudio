from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


def _iter_mysql_script_statements(sql_text: str):
    """Itera sentencias MySQL soportando `DELIMITER`.

    Pensado para scripts tipo 002_post_schema_objects.sql:
    - Comentarios `--` por línea.
    - Cambios de delimitador (`DELIMITER $$` / `DELIMITER ;`).
    - Triggers/Events con `BEGIN ... END` que contienen `;` internos.
    """

    delimiter = ";"
    buf: list[str] = []

    in_single = False
    in_double = False
    in_backtick = False
    escape_next = False

    def flush_if_complete():
        nonlocal buf
        if not buf:
            return None
        statement = "".join(buf).strip()
        if not statement:
            buf = []
            return None
        return statement

    for raw_line in sql_text.splitlines():
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if not stripped:
            continue

        if stripped.startswith("--"):
            continue

        upper = stripped.upper()
        if upper.startswith("DELIMITER "):
            parts = stripped.split(maxsplit=1)
            if len(parts) != 2 or not parts[1].strip():
                raise CommandError(f"DELIMITER inválido: {raw_line}")
            delimiter = parts[1].strip()
            continue

        line_with_nl = line + "\n"
        j = 0
        while j < len(line_with_nl):
            ch = line_with_nl[j]

            if escape_next:
                buf.append(ch)
                escape_next = False
                j += 1
                continue

            if (in_single or in_double) and ch == "\\":
                buf.append(ch)
                escape_next = True
                j += 1
                continue

            if ch == "'" and not in_double and not in_backtick:
                in_single = not in_single
                buf.append(ch)
                j += 1
                continue

            if ch == '"' and not in_single and not in_backtick:
                in_double = not in_double
                buf.append(ch)
                j += 1
                continue

            if ch == "`" and not in_single and not in_double:
                in_backtick = not in_backtick
                buf.append(ch)
                j += 1
                continue

            if not in_single and not in_double and not in_backtick:
                if delimiter and line_with_nl.startswith(delimiter, j):
                    stmt = "".join(buf).strip()
                    buf = []
                    j += len(delimiter)
                    if stmt:
                        yield stmt
                    continue

            buf.append(ch)
            j += 1

    tail = flush_if_complete()
    if tail:
        yield tail


class Command(BaseCommand):
    help = (
        "Instala todos los objetos SQL post-migración (triggers, events y views) "
        "ejecutando BaseDeDatos/002_post_schema_objects.sql usando la conexión configurada en Django."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=None,
            help=(
                "Ruta opcional al .sql (por defecto: BaseDeDatos/002_post_schema_objects.sql)."
            ),
        )

    def handle(self, *args, **options):
        base_dir = Path(getattr(settings, "BASE_DIR", Path.cwd())).resolve()
        workspace_root = base_dir.parent

        custom_path = options.get("path")
        sql_path = (
            Path(custom_path).resolve()
            if custom_path
            else (workspace_root / "BaseDeDatos" / "002_post_schema_objects.sql")
        )

        if not sql_path.exists():
            raise CommandError(f"No se encontró el archivo SQL: {sql_path}")

        sql_text = sql_path.read_text(encoding="utf-8")
        statements = list(_iter_mysql_script_statements(sql_text))

        if not statements:
            raise CommandError("El archivo SQL no contiene sentencias ejecutables.")

        with connection.cursor() as cursor:
            cursor.execute("SELECT DATABASE()")
            db_name = cursor.fetchone()[0]

        self.stdout.write(self.style.MIGRATE_HEADING("Instalando objetos SQL"))
        self.stdout.write(f"- Archivo: {sql_path}")
        self.stdout.write(f"- Database(): {db_name}")

        executed = 0
        with connection.cursor() as cursor:
            for stmt in statements:
                cursor.execute(stmt)
                executed += 1

        self.stdout.write(self.style.SUCCESS(f"Instalación completa. Sentencias ejecutadas: {executed}"))
