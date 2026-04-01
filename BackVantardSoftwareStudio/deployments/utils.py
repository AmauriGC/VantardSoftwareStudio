from django.utils import timezone
from .models import Deployment
import re

def get_active_deployment(deployment_id: int) -> Deployment | None:
    try:
        return Deployment.objects.get(
            pk=deployment_id,
            deleted_at__isnull=True,
            status=Deployment.Status.ACTIVE
        )
    except Deployment.DoesNotExist:
        return None

def deactivate_deployment(deployment_id: int) -> bool:
    deployment = get_active_deployment(deployment_id)
    if deployment:
        deployment.soft_delete()
        return True
    return False

def get_user_deployments(user_id: int):
    return Deployment.objects.filter(
        user_id=user_id,
        deleted_at__isnull=True
    )


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
