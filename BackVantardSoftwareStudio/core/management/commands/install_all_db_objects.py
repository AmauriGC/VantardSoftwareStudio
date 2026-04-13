from __future__ import annotations

from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class _SqlParser:
    """Parser de sentencias MySQL con soporte para DELIMITER y strings."""

    def __init__(self):
        self.delimiter = ";"
        self._buf: list[str] = []
        self._in_single = False
        self._in_double = False
        self._in_backtick = False
        self._escape_next = False

    # ------------------------------------------------------------------
    # Helpers de estado de carácter
    # ------------------------------------------------------------------

    def _inside_string(self) -> bool:
        return self._in_single or self._in_double or self._in_backtick

    def _try_consume_escape(self, ch: str) -> bool:
        if self._escape_next:
            self._buf.append(ch)
            self._escape_next = False
            return True
        if (self._in_single or self._in_double) and ch == "\\":
            self._buf.append(ch)
            self._escape_next = True
            return True
        return False

    def _try_toggle_quote(self, ch: str) -> bool:
        if ch == "'" and not self._in_double and not self._in_backtick:
            self._in_single = not self._in_single
        elif ch == '"' and not self._in_single and not self._in_backtick:
            self._in_double = not self._in_double
        elif ch == "`" and not self._in_single and not self._in_double:
            self._in_backtick = not self._in_backtick
        else:
            return False
        self._buf.append(ch)
        return True

    def _try_emit_at(self, text: str, pos: int):
        """Si `pos` es el inicio del delimitador (fuera de string), emite la sentencia."""
        if self._inside_string() or not text.startswith(self.delimiter, pos):
            return None, pos
        stmt = "".join(self._buf).strip()
        self._buf = []
        return stmt or None, pos + len(self.delimiter)

    # ------------------------------------------------------------------
    # API pública
    # ------------------------------------------------------------------

    def feed_line(self, line: str):
        """Procesa una línea y genera sentencias completas."""
        text = line + "\n"
        pos = 0
        while pos < len(text):
            ch = text[pos]
            if self._try_consume_escape(ch) or self._try_toggle_quote(ch):
                pos += 1
                continue
            stmt, pos = self._try_emit_at(text, pos)
            if stmt is not None:
                yield stmt
                continue
            self._buf.append(ch)
            pos += 1

    def flush(self):
        stmt = "".join(self._buf).strip()
        self._buf = []
        return stmt or None


def _parse_delimiter(raw_line: str, stripped: str) -> str:
    parts = stripped.split(maxsplit=1)
    if len(parts) != 2 or not parts[1].strip():
        raise CommandError(f"DELIMITER inválido: {raw_line}")
    return parts[1].strip()


def _iter_mysql_script_statements(sql_text: str):
    """Itera sentencias MySQL soportando `DELIMITER`.

    Pensado para scripts tipo 002_post_schema_objects.sql:
    - Comentarios `--` por línea.
    - Cambios de delimitador (`DELIMITER $$` / `DELIMITER ;`).
    - Triggers/Events con `BEGIN ... END` que contienen `;` internos.
    """
    parser = _SqlParser()

    for raw_line in sql_text.splitlines():
        stripped = raw_line.strip()

        if not stripped or stripped.startswith("--"):
            continue

        if stripped.upper().startswith("DELIMITER "):
            parser.delimiter = _parse_delimiter(raw_line, stripped)
            continue

        yield from parser.feed_line(raw_line.rstrip("\n"))

    tail = parser.flush()
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
