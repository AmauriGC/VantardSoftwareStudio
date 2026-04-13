import os
import logging
import zipfile
import shutil
from pathlib import Path
from uuid import uuid4

# Extensiones permitidas en el ZIP (sitios estáticos únicamente)
ALLOWED_EXTENSIONS = {
    '.html', '.htm', '.css', '.js', '.mjs',
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.avif',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.json', '.txt', '.xml', '.map',
    '.mp4', '.webm', '.mp3', '.ogg',
    '.pdf',
}

# Extensiones explícitamente bloqueadas (ejecutables y configs peligrosas)
BLOCKED_EXTENSIONS = {
    '.php', '.py', '.rb', '.go', '.java', '.jsp', '.aspx', '.asp',
    '.sh', '.bash', '.zsh', '.fish',
    '.exe', '.bat', '.cmd', '.ps1', '.vbs', '.wsf', '.msi',
    '.htaccess', '.htpasswd',
    '.env',
    '.sql', '.db', '.sqlite', '.sqlite3',
    '.zip',
}

MAX_FILES = 500
ZIP_BOMB_RATIO = 100


logger = logging.getLogger(__name__)


class ZipValidationError(Exception):
    pass


def _validate_member(member) -> bool:
    """Valida un archivo dentro del ZIP. Retorna True si el archivo es HTML."""
    filename = member.filename

    # Protección Path Traversal (Zip Slip)
    if '..' in filename or filename.startswith('/') or filename.startswith('\\'):
        logger.warning('ZIP inválido: ruta insegura detectada (zip slip). filename=%r', filename)
        raise ZipValidationError(
            'El ZIP contiene rutas inválidas. Vuelve a generar el ZIP y reintenta.'
        )

    _, ext = os.path.splitext(filename.lower())

    if ext == '.zip':
        logger.warning('ZIP inválido: ZIP anidado detectado. filename=%r', filename)
        raise ZipValidationError(
            'El ZIP contiene archivos comprimidos dentro de otro ZIP. '
            'Sube directamente los archivos del sitio (por ejemplo: index.html, css, js, imágenes).'
        )

    if ext in BLOCKED_EXTENSIONS:
        logger.warning('ZIP inválido: extensión bloqueada. filename=%r ext=%r', filename, ext)
        raise ZipValidationError(
            'El ZIP contiene archivos no permitidos por seguridad. '
            'Sube únicamente archivos de un sitio web estático.'
        )

    if ext and ext not in ALLOWED_EXTENSIONS:
        logger.warning('ZIP inválido: extensión no permitida. filename=%r ext=%r', filename, ext)
        raise ZipValidationError(
            'El ZIP contiene archivos no compatibles. '
            'Sube únicamente archivos de un sitio web estático.'
        )

    compressed = member.compress_size if member.compress_size > 0 else 1
    if member.file_size / compressed > ZIP_BOMB_RATIO:
        ratio = member.file_size / compressed
        logger.warning(
            'ZIP inválido: ratio compresión sospechosa (posible zip bomb). filename=%r ratio=%s',
            filename,
            ratio,
        )
        raise ZipValidationError(
            'El ZIP no pudo validarse por seguridad. Vuelve a generar el ZIP y reintenta.'
        )

    return ext in ('.html', '.htm')


def validate_zip(zip_file, max_disk_mb: int) -> dict:
    """Valida seguridad y contenido del ZIP. Retorna dict con total_uncompressed_mb y file_count."""
    zip_file.seek(0)
    if not zipfile.is_zipfile(zip_file):
        logger.warning('Archivo no es ZIP válido o está corrupto.')
        raise ZipValidationError('El archivo no es un ZIP válido o está dañado.')

    zip_file.seek(0)
    with zipfile.ZipFile(zip_file, 'r') as zf:
        members = zf.infolist()
        if not members:
            logger.warning('ZIP vacío (sin miembros).')
            raise ZipValidationError('El archivo ZIP está vacío.')

        files_only = [m for m in members if not m.is_dir()]
        if len(files_only) > MAX_FILES:
            logger.warning('ZIP inválido: demasiados archivos. file_count=%s max=%s', len(files_only), MAX_FILES)
            raise ZipValidationError('El ZIP contiene demasiados archivos. Reduce el contenido y reintenta.')

        total_uncompressed = 0
        has_html = False

        for member in files_only:
            has_html = _validate_member(member) or has_html
            total_uncompressed += member.file_size

        total_mb = total_uncompressed / (1024 * 1024)
        if total_mb > max_disk_mb:
            logger.warning('ZIP excede almacenamiento del plan. total_mb=%.2f max_disk_mb=%s', total_mb, max_disk_mb)
            raise ZipValidationError('El contenido del ZIP supera el almacenamiento disponible de tu plan.')

        if not has_html:
            logger.warning('ZIP inválido: no contiene HTML.')
            raise ZipValidationError('El ZIP debe contener al menos un archivo HTML de un sitio web estático.')

        return {
            'total_uncompressed_mb': round(total_mb, 2),
            'file_count': len(files_only),
        }


def save_zip_file_for_user(
    zip_file,
    *,
    user_id: int,
    version_number: int,
    original_filename: str,
    media_root: Path,
) -> str:
    """Guarda el ZIP y retorna la ruta relativa a MEDIA_ROOT."""
    safe_name = Path(original_filename).name
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c in ('.', '-', '_'))
    if not safe_name:
        safe_name = 'sitio.zip'

    dest_dir = media_root / 'deployments' / f'u{user_id}'
    dest_dir.mkdir(parents=True, exist_ok=True)

    zip_filename = f'v{version_number}_{safe_name}'
    dest_path = dest_dir / zip_filename

    zip_file.seek(0)
    with open(dest_path, 'wb') as f:
        for chunk in zip_file.chunks():
            f.write(chunk)

    return str(Path('deployments') / f'u{user_id}' / zip_filename)


def _prepare_temp_dir(tmp_dir: Path) -> None:
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True, exist_ok=True)


def _extract_zipfile_to_dir(zf: zipfile.ZipFile, dest_root: Path) -> None:
    dest_root_resolved = dest_root.resolve()

    for member in zf.infolist():
        if member.is_dir():
            continue

        dest = dest_root / Path(member.filename)

        try:
            dest.resolve().relative_to(dest_root_resolved)
        except ValueError:
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)

        with zf.open(member) as src, open(dest, 'wb') as out:
            shutil.copyfileobj(src, out)


def _swap_site_dirs(*, tmp_dir: Path, final_dir: Path, backup_dir: Path) -> None:
    backed_up = False
    if final_dir.exists():
        shutil.move(str(final_dir), str(backup_dir))
        backed_up = True

    try:
        shutil.move(str(tmp_dir), str(final_dir))
    except Exception:
        if backed_up and backup_dir.exists() and not final_dir.exists():
            shutil.move(str(backup_dir), str(final_dir))
        raise
    else:
        if backed_up and backup_dir.exists():
            shutil.rmtree(backup_dir)


def extract_zip_to_site(zip_abs_path: Path, domain: str, media_root: Path) -> None:
    """Extrae el ZIP en media/sites/{domain}/ de forma segura.

    Extrae primero a un directorio temporal y solo reemplaza el sitio publicado
    si la extracción completa. Esto evita romper el sitio activo en caso de error.
    """

    sites_root = media_root / 'sites'
    sites_root.mkdir(parents=True, exist_ok=True)

    final_dir = sites_root / domain
    tmp_dir = sites_root / f'.tmp_{domain}_{uuid4().hex}'
    backup_dir = sites_root / f'.bak_{domain}_{uuid4().hex}'

    _prepare_temp_dir(tmp_dir)

    try:
        with zipfile.ZipFile(zip_abs_path, 'r') as zf:
            _extract_zipfile_to_dir(zf, tmp_dir)

        # Swap seguro: primero respaldar el sitio publicado, luego publicar el nuevo.
        # Esto evita perder el sitio activo si ocurre un error al mover.
        _swap_site_dirs(tmp_dir=tmp_dir, final_dir=final_dir, backup_dir=backup_dir)

    finally:
        if tmp_dir.exists():
            shutil.rmtree(tmp_dir)
