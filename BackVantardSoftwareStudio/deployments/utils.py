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

def generate_site_url(domain: str, base_url: str) -> str:
    """Genera la URL pública del sitio a partir del dominio."""
    return f"{base_url.rstrip('/')}/sites/{domain}/"

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
            Deployment.objects.filter(user=user, deleted_at__isnull=True)
            .aggregate(v=Max('version_number'))
            .get('v')
        )
        next_version = int(next_version or 0) + 1

        zip_rel_path = save_zip_file_for_user(
            zip_file,
            user_id=user.id,
            version_number=next_version,
            original_filename=getattr(zip_file, 'name', 'sitio.zip'),
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
                status=Deployment.Status.FAILED,
                version_number=next_version,
                zip_filename=Path(getattr(zip_file, 'name', 'sitio.zip')).name,
                zip_path=zip_rel_path,
                disk_used_mb=new_disk_used_mb_int,
                traffic_visit_count=0,
            )
            return failed_deployment

        # Éxito: recién aquí reemplazamos SOLO el/los activos previos del usuario
        (
            Deployment.objects.filter(user=user, domain=domain, status=Deployment.Status.ACTIVE, deleted_at__isnull=True)
            .update(status=Deployment.Status.REPLACED)
        )

        deployment = Deployment.objects.create(
            user=user,
            domain=domain,
            site_url=generate_site_url(domain, settings.DEPLOYMENT_BASE_URL),
            status=Deployment.Status.ACTIVE,
            version_number=next_version,
            zip_filename=Path(getattr(zip_file, 'name', 'sitio.zip')).name,
            zip_path=zip_rel_path,
            disk_used_mb=new_disk_used_mb_int,
            traffic_visit_count=0,
        )

        return deployment
