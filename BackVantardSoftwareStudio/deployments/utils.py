import re
import logging
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.db.models import Max

from user_plans.models import UserPlan

from .models import Deployment
from .zip_utils import ZipValidationError, extract_zip_to_site, save_zip_file_for_user, validate_zip


logger = logging.getLogger(__name__)


DEFAULT_SITE_ZIP_NAME = 'sitio.zip'

_COMMON_SITE_ENTRY_DIRS: tuple[str, ...] = (
    'dist',
    'build',
    'public',
    'html',
)

_IGNORED_CONTAINER_NAMES: set[str] = {
    '__MACOSX',
}


def collapse_site_container_dir(root: Path) -> Path:
    """Colapsa carpetas contenedoras típicas de ZIP.

    Ejemplo: muchos ZIP vienen como /sites/<domain>/<carpeta-del-proyecto>/...
    y queremos tratar esa carpeta como raíz efectiva del sitio.

    Solo colapsa cuando el directorio actual contiene *únicamente* una carpeta (sin archivos).
    """
    current = root
    for _ in range(5):
        if not current.exists() or not current.is_dir():
            break

        try:
            children = [p for p in current.iterdir() if p.name not in _IGNORED_CONTAINER_NAMES]
        except OSError:
            break

        if len(children) != 1:
            break

        only_child = children[0]
        if only_child.is_dir():
            current = only_child
            continue

        break

    return current


def detect_site_entry_subdir(site_root: Path) -> str | None:
    """Detecta si el sitio requiere un subdirectorio en la URL para abrirse.

    Retorna el nombre del subdirectorio (p. ej. 'html' o 'dist') cuando no hay
    index.html en la raíz efectiva, pero sí dentro de un subdirectorio común.
    Si el sitio puede abrirse en /sites/<domain>/, retorna None.
    """
    effective_root = collapse_site_container_dir(site_root)

    root_index = effective_root / 'index.html'
    if root_index.exists() and root_index.is_file():
        return None

    for candidate in _COMMON_SITE_ENTRY_DIRS:
        candidate_index = effective_root / candidate / 'index.html'
        if candidate_index.exists() and candidate_index.is_file():
            return candidate

    return None


def generate_site_url(domain: str, base_url: str, entry_subdir: str | None = None) -> str:
    """Genera la URL pública del sitio a partir del dominio.

    Algunos ZIP subidos traen el index dentro de una subcarpeta (p.ej. html/ o dist/).
    En esos casos, la URL de entrada debe incluir el subdirectorio.
    """
    base = base_url.rstrip('/')
    if entry_subdir:
        safe_entry = str(entry_subdir).strip('/')
        return f"{base}/sites/{domain}/{safe_entry}/"
    return f"{base}/sites/{domain}/"

def is_valid_domain(value: str) -> bool:
    """
    Valida que el dominio sea URL-safe:
    solo letras minúsculas, números y guiones.
    No puede empezar ni terminar con guión.
    """
    return bool(re.match(r'^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$', value))


def _resolve_max_disk_mb(active_plan: UserPlan | None) -> int:
    if not active_plan or not getattr(active_plan, 'plan', None):
        return 10

    try:
        return int(active_plan.plan.max_disk_mb)
    except (TypeError, ValueError, AttributeError):
        return 10


def deploy_zip_as_new_deployment(*, user, domain: str, zip_file, active_plan: UserPlan | None) -> Deployment:
    """Crea SIEMPRE un nuevo Deployment por ZIP y conserva historial en la misma tabla.

    Reglas de negocio:
    - version_number incrementa globalmente por usuario.
    - solo puede existir 1 deployment activo por usuario a la vez.
      Al crear uno nuevo, cualquier deployment previo en status=active del usuario pasa a status=replaced.
    - el dominio puede repetirse si pertenece al mismo usuario; si otro usuario lo usa, no disponible.
    - el ZIP siempre debe existir para crear.
    - tráfico: un nuevo upload inicia en 0.
    """

    if not zip_file:
        raise ZipValidationError('Debes subir un archivo ZIP.')
    max_disk_mb = _resolve_max_disk_mb(active_plan)

    # Valida contra el límite de disco del plan (tamaño descomprimido)
    validation = validate_zip(zip_file, max_disk_mb)

    new_disk_used_mb_int = max(int(round(validation['total_uncompressed_mb'])), 1)

    media_root = Path(settings.MEDIA_ROOT)

    with transaction.atomic():
        conflict = (
            Deployment.objects.filter(domain=domain, deleted_at__isnull=True)
            .exclude(user=user)
            .exists()
        )
        if conflict:
            logger.info('Dominio en conflicto al crear deployment. user_id=%s domain=%r', getattr(user, 'pk', None), domain)
            raise ZipValidationError('El dominio no está disponible.')

        next_version = (
            Deployment.objects.filter(user=user)
            .aggregate(v=Max('version_number'))
            .get('v')
        )
        next_version = int(next_version or 0) + 1

        zip_rel_path = save_zip_file_for_user(
            zip_file,
            user_id=user.id,
            version_number=next_version,
            original_filename=getattr(zip_file, 'name', DEFAULT_SITE_ZIP_NAME),
            media_root=media_root,
        )

        zip_abs_path = media_root / zip_rel_path

        # Intentar publicar archivos. Si falla, registrar FAILED y NO tocar el ACTIVE actual.
        try:
            extract_zip_to_site(zip_abs_path, domain, media_root)
        except Exception:
            failed_deployment = Deployment.objects.create(
                user=user,
                domain=domain,
                site_url=generate_site_url(domain, settings.DEPLOYMENT_BASE_URL),
                status=Deployment.StatusChoices.FAILED,
                version_number=next_version,
                zip_filename=Path(getattr(zip_file, 'name', DEFAULT_SITE_ZIP_NAME)).name,
                zip_path=zip_rel_path,
                disk_used_mb=new_disk_used_mb_int,
                traffic_visit_count=0,
            )
            return failed_deployment

        entry_subdir = detect_site_entry_subdir(media_root / 'sites' / domain)

        # Éxito: recién aquí reemplazamos SOLO el/los activos previos del usuario
        (
            Deployment.objects.filter(user=user, status=Deployment.StatusChoices.ACTIVE, deleted_at__isnull=True)
            .update(status=Deployment.StatusChoices.REPLACED)
        )

        deployment = Deployment.objects.create(
            user=user,
            domain=domain,
            site_url=generate_site_url(domain, settings.DEPLOYMENT_BASE_URL, entry_subdir),
            status=Deployment.StatusChoices.ACTIVE,
            version_number=next_version,
            zip_filename=Path(getattr(zip_file, 'name', DEFAULT_SITE_ZIP_NAME)).name,
            zip_path=zip_rel_path,
            disk_used_mb=new_disk_used_mb_int,
            traffic_visit_count=0,
        )

        return deployment
