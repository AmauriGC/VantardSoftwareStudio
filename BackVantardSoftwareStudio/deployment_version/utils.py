import os
import zipfile
import shutil
from pathlib import Path

  # ---------------------------------------------------------------------------
  # Extensiones permitidas en el ZIP (sitios estáticos únicamente)
  # ---------------------------------------------------------------------------

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
}

MAX_FILES         = 500   # Protección DoS: máximo de archivos en el ZIP
ZIP_BOMB_RATIO    = 100   # Ratio descomprimido/comprimido sospechoso


class ZipValidationError(Exception):
    pass


  # ---------------------------------------------------------------------------
  # Validar el ZIP antes de tocarlo
  # ---------------------------------------------------------------------------

def validate_zip(zip_file, max_disk_mb: int) -> dict:
    """
    Valida seguridad y contenido del ZIP.
    Raises ZipValidationError si algo falla.
    Returns dict con total_uncompressed_mb y file_count.
    """
      # 1. Verificar que no esté corrupto
    zip_file.seek(0)
    if not zipfile.is_zipfile(zip_file):
        raise ZipValidationError('El archivo no es un ZIP válido o está corrupto.')

    zip_file.seek(0)

    with zipfile.ZipFile(zip_file, 'r') as zf:
        members = zf.infolist()

          # 2. No puede estar vacío
        if not members:
            raise ZipValidationError('El archivo ZIP está vacío.')

          # 3. Límite de cantidad de archivos (protección DoS)
        files_only = [m for m in members if not m.is_dir()]
        if len(files_only) > MAX_FILES:
            raise ZipValidationError(
                f'El ZIP contiene {len(files_only)} archivos. '
                f'El máximo permitido es {MAX_FILES}.'
            )

        total_uncompressed = 0
        has_html = False

        for member in files_only:
            filename = member.filename

              # 4. Protección Path Traversal (Zip Slip)
            if '..' in filename or filename.startswith('/') or filename.startswith('\\'):
                raise ZipValidationError(
                    f'Ruta inválida detectada: "{filename}". '
                    'El ZIP no puede contener rutas con "..".'
                )

              # 5. Validar extensión
            _, ext = os.path.splitext(filename.lower())

            if ext in BLOCKED_EXTENSIONS:
                  raise ZipValidationError(
                    f'El archivo "{filename}" no está permitido. '
                    f'La extensión "{ext}" está bloqueada por seguridad.'
                )

            if ext and ext not in ALLOWED_EXTENSIONS:
                raise ZipValidationError(
                    f'Extensión no permitida: "{ext}" en "{filename}". '
                    'Solo se aceptan archivos de sitios estáticos '
                    '(html, css, js, imágenes, fuentes, etc).'
                )

            if ext in ('.html', '.htm'):
                has_html = True

              # 6. Protección Zip Bomb por archivo
            compressed = member.compress_size if member.compress_size > 0 else 1
            if member.file_size / compressed > ZIP_BOMB_RATIO:
                raise ZipValidationError(
                    f'El archivo "{filename}" tiene una ratio de compresión '
                    'sospechosamente alta. Posible ZIP bomb.'
                )

            total_uncompressed += member.file_size

          # 7. Tamaño total vs límite del plan
        total_mb = total_uncompressed / (1024 * 1024)
        if total_mb > max_disk_mb:
            raise ZipValidationError(
                f'El contenido del ZIP ocupa {total_mb:.1f} MB pero tu plan '
                f'solo permite {max_disk_mb} MB de almacenamiento.'
            )

          # 8. Debe tener al menos un HTML
        if not has_html:
            raise ZipValidationError(
                'El ZIP debe contener al menos un archivo .html. '
                'Solo se aceptan sitios web estáticos.'
            )

        return {
            'total_uncompressed_mb': round(total_mb, 2),
            'file_count': len(files_only),
        }


  # ---------------------------------------------------------------------------
  # Guardar el archivo ZIP en disco
  # ---------------------------------------------------------------------------

def save_zip_file(
    zip_file,
    deployment_id: int,
    version_number: int,
    original_filename: str,
    media_root: Path,
) -> str:
    """
    Guarda el ZIP y retorna la ruta relativa a MEDIA_ROOT.
    """
    # Sanitizar nombre: solo alfanuméricos, puntos, guiones y guiones bajos
    safe_name = Path(original_filename).name
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c in ('.',  '-', '_'))
    if not safe_name:
        safe_name = 'sitio.zip'

    dest_dir = media_root / 'deployments' / str(deployment_id)
    dest_dir.mkdir(parents=True, exist_ok=True)

    zip_filename = f'v{version_number}_{safe_name}'
    dest_path    = dest_dir / zip_filename

    zip_file.seek(0)
    with open(dest_path, 'wb') as f:
        for chunk in zip_file.chunks():
            f.write(chunk)

    return str(Path('deployments') / str(deployment_id) / zip_filename)


  # ---------------------------------------------------------------------------
  # Extraer el ZIP al directorio del sitio
  # ---------------------------------------------------------------------------

def extract_zip_to_site(zip_abs_path: Path, domain: str, media_root: Path) -> None:
    """
    Extrae el ZIP en media/sites/{domain}/, reemplazando el contenido anterior.
    Incluye doble verificación anti Path Traversal durante la extracción.
    """
    site_dir = media_root / 'sites' / domain

      # Limpiar contenido anterior
    if site_dir.exists():
        shutil.rmtree(site_dir)
    site_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_abs_path, 'r') as zf:
        for member in zf.infolist():
            if member.is_dir():
                continue

            dest = site_dir / Path(member.filename)

              # Verificar que la ruta no escape del site_dir
            try:
                dest.resolve().relative_to(site_dir.resolve())
            except ValueError:
                continue  # Ignorar silenciosamente rutas peligrosas

            dest.parent.mkdir(parents=True, exist_ok=True)

            with zf.open(member) as src, open(dest, 'wb') as out:
                out.write(src.read())


  # ---------------------------------------------------------------------------
  # Eliminar archivos del sitio del disco
  # ---------------------------------------------------------------------------

def delete_site_files(domain: str, media_root: Path) -> None:
    site_dir = media_root / 'sites' / domain
    if site_dir.exists():
        shutil.rmtree(site_dir)

        