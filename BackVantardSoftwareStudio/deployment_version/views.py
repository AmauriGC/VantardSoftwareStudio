from pathlib import Path
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from deployments.models import Deployment
from user_plans.models import UserPlan
from system_logs.utils import log_request
from kernel.responses import success_response, error_response

from .models import DeploymentVersion
from .serializers import DeploymentVersionOutputSerializer
from .utils import (
    ZipValidationError,
    validate_zip,
    save_zip_file,
    extract_zip_to_site,
)


# ---------------------------------------------------------------------------
# Helper: obtener deployment verificando que pertenece al usuario
# ---------------------------------------------------------------------------

def _get_deployment(deployment_id, user):
    try:
        return Deployment.objects.get(
            pk=deployment_id,
            user=user,
            deleted_at__isnull=True,
        )
    except Deployment.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# Subir nueva versión
# ---------------------------------------------------------------------------

class UploadVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deployment_id):
        deployment = _get_deployment(deployment_id, request.user)
        if not deployment:
            return error_response(message='Deployment no encontrado.', status=404)

        # Verificar plan activo
        active_plan = UserPlan.objects.filter(
            user=request.user,
            status=UserPlan.Status.ACTIVE,
            deleted_at__isnull=True,
        ).select_related('plan').first()

        if not active_plan:
            log_request(request, 'UPLOAD_VERSION_FAILED', 403)
            return error_response(
                message='Necesitas una suscripción activa para subir versiones.',
                status=403,
            )

        # Verificar que se envió el archivo
        zip_file = request.FILES.get('zip_file')
        if not zip_file:
            return error_response(
                message='Debes enviar el archivo ZIP en el campo "zip_file".',
                status=400,
            )

        # Validar el ZIP (seguridad + contenido + límite de disco)
        try:
            zip_info = validate_zip(zip_file, active_plan.plan.max_disk_mb)
        except ZipValidationError as e:
            log_request(request, 'UPLOAD_VERSION_FAILED', 400)
            return error_response(message=str(e), status=400)

        media_root     = Path(settings.MEDIA_ROOT)
        version_number = DeploymentVersion.get_next_version_number(deployment.pk)

        # Guardar ZIP en disco
        try:
            zip_relative_path = save_zip_file(
                zip_file         = zip_file,
                deployment_id    = deployment.pk,
                version_number   = version_number,
                original_filename= zip_file.name,
                media_root       = media_root,
            )
        except Exception:
            log_request(request, 'UPLOAD_VERSION_FAILED', 500)
            return error_response(
                message='Error al guardar el archivo en el servidor.',
                status=500,
            )

        # Extraer ZIP al directorio del sitio
        zip_abs_path = media_root / zip_relative_path
        try:
            extract_zip_to_site(zip_abs_path, deployment.domain, media_root)
        except Exception:
            zip_abs_path.unlink(missing_ok=True)
            log_request(request, 'UPLOAD_VERSION_FAILED', 500)
            return error_response(
                message='Error al procesar el archivo ZIP.',
                status=500,
            )

        # Archivar versión activa anterior
        DeploymentVersion.objects.filter(
            deployment   = deployment,
            status       = DeploymentVersion.Status.ACTIVE,
            deleted_at__isnull=True,
        ).update(status=DeploymentVersion.Status.ARCHIVED)

        # Crear nueva versión
        disk_used_mb = max(round(zip_info['total_uncompressed_mb']), 1)
        version = DeploymentVersion.objects.create(
            deployment     = deployment,
            version_number = version_number,
            zip_filename   = zip_file.name,
            zip_path       = zip_relative_path,
            disk_used_mb   = disk_used_mb,
            status         = DeploymentVersion.Status.ACTIVE,
        )

        # Actualizar disco usado en el deployment
        deployment.disk_used_mb = disk_used_mb
        deployment.status       = Deployment.Status.ACTIVE
        deployment.save(update_fields=['disk_used_mb', 'status', 'updated_at'])

        log_request(request, 'UPLOAD_VERSION', 201)
        return success_response(
            data=DeploymentVersionOutputSerializer(version).data,
            message=f'Versión {version_number} subida correctamente.',
            status=201,
        )


# ---------------------------------------------------------------------------
# Listar historial de versiones de un deployment
# ---------------------------------------------------------------------------

class VersionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, deployment_id):
        deployment = _get_deployment(deployment_id, request.user)
        if not deployment:
            return error_response(message='Deployment no encontrado.', status=404)

        qs = DeploymentVersion.objects.filter(
            deployment   = deployment,
            deleted_at__isnull=True,
        ).order_by('-version_number')

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = DeploymentVersionOutputSerializer(page, many=True)
        log_request(request, 'LIST_VERSIONS', 200)
        return success_response(
            data={
                'total':    paginator.page.paginator.count,
                'pagina':   paginator.page.number,
                'paginas':  paginator.page.paginator.num_pages,
                'versions': serializer.data,
            },
            message='Historial de versiones obtenido correctamente.',
        )


# ---------------------------------------------------------------------------
# Detalle de una versión específica
# ---------------------------------------------------------------------------

class VersionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, deployment_id, pk):
        deployment = _get_deployment(deployment_id, request.user)
        if not deployment:
            return error_response(message='Deployment no encontrado.', status=404)

        try:
            version = DeploymentVersion.objects.get(
                pk           = pk,
                deployment   = deployment,
                deleted_at__isnull=True,
            )
        except DeploymentVersion.DoesNotExist:
            return error_response(message='Versión no encontrada.', status=404)

        log_request(request, 'GET_VERSION', 200)
        return success_response(
            data=DeploymentVersionOutputSerializer(version).data,
            message='Versión obtenida correctamente.',
        )


# ---------------------------------------------------------------------------
# Rollback: reactivar una versión archivada
# ---------------------------------------------------------------------------

class RollbackVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, deployment_id, pk):
        deployment = _get_deployment(deployment_id, request.user)
        if not deployment:
            return error_response(message='Deployment no encontrado.', status=404)

        # Versión a restaurar
        try:
            target_version = DeploymentVersion.objects.get(
                pk           = pk,
                deployment   = deployment,
                deleted_at__isnull=True,
            )
        except DeploymentVersion.DoesNotExist:
            return error_response(message='Versión no encontrada.', status=404)

        if target_version.status == DeploymentVersion.Status.ACTIVE:
            return error_response(
                message='Esta versión ya está activa.',
                status=400,
            )

        if target_version.status != DeploymentVersion.Status.ARCHIVED:
            return error_response(
                message='Solo se puede hacer rollback a versiones archivadas.',
                status=400,
            )

        # Verificar que el ZIP de la versión anterior todavía existe en disco
        media_root   = Path(settings.MEDIA_ROOT)
        zip_abs_path = media_root / target_version.zip_path

        if not zip_abs_path.exists():
            log_request(request, 'ROLLBACK_VERSION_FAILED', 500)
            return error_response(
                message='El archivo ZIP de esta versión ya no está disponible en el servidor.',
                status=500,
            )

        # Archivar la versión activa actual
        DeploymentVersion.objects.filter(
            deployment   = deployment,
            status       = DeploymentVersion.Status.ACTIVE,
            deleted_at__isnull=True,
        ).update(status=DeploymentVersion.Status.ARCHIVED)

        # Re-extraer el ZIP de la versión objetivo al directorio del sitio
        try:
            extract_zip_to_site(zip_abs_path, deployment.domain, media_root)
        except Exception:
            log_request(request, 'ROLLBACK_VERSION_FAILED', 500)
            return error_response(
                message='Error al restaurar los archivos del sitio.',
                status=500,
            )

        # Activar la versión objetivo
        target_version.status     = DeploymentVersion.Status.ACTIVE
        target_version.deleted_at = None
        target_version.save(update_fields=['status', 'deleted_at', 'updated_at'])

        # Actualizar disco usado en el deployment
        deployment.disk_used_mb = target_version.disk_used_mb
        deployment.save(update_fields=['disk_used_mb', 'updated_at'])

        log_request(request, 'ROLLBACK_VERSION', 200)
        return success_response(
            data=DeploymentVersionOutputSerializer(target_version).data,
            message=f'Rollback a versión {target_version.version_number} realizado correctamente.',
        )
