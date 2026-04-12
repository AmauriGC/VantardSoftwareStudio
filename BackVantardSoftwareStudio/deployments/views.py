import logging
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import FileResponse, Http404

from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from kernel.responses import error_response, success_response
from system_logs.models import SystemLog
from system_logs.utils import log_request
from user_plans.models import UserPlan
from users.permissions import IsAdminUser

from .models import Deployment
from .serializers import (
    AdminDeploymentOutputSerializer,
    DeploymentCreateSerializer,
    DeploymentOutputSerializer,
    DeploymentUpdateSerializer,
)
from .utils import deploy_zip_as_new_deployment
from .zip_utils import ZipValidationError, extract_zip_to_site


logger = logging.getLogger(__name__)


DEPLOYMENT_NOT_FOUND = 'Despliegue no encontrado.'


class _DefaultPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 200


def _apply_text_search(qs, raw_q: str, lookups: list[str]):
    q = (raw_q or '').strip()
    if not q:
        return qs

    condition = Q()
    for lookup in lookups:
        condition |= Q(**{lookup: q})
    return qs.filter(condition)


def _paginated_success_response(*, paginator: _DefaultPagination, key: str, items, message: str):
    return success_response(
        data={
            'total': paginator.page.paginator.count,
            'pagina': paginator.page.number,
            'paginas': paginator.page.paginator.num_pages,
            key: items,
        },
        message=message,
    )


def _serialize_site_log_item(*, item: SystemLog, domain: str | None, deployment_id: int | None = None) -> dict:
    payload = {
        'id': item.id,
        'domain': domain,
        'path': item.request_path,
        'method': item.http_method,
        'client_ip': item.ip_address,
        'status_code': item.status_code,
        'created_at': item.created_at,
    }
    if deployment_id is not None:
        payload['deployment_id'] = deployment_id
    return payload


def _extract_domain_from_site_path(request_path):
    if not request_path:
        return None

    prefix = '/sites/'
    if not str(request_path).startswith(prefix):
        return None

    parts = str(request_path).split('/')
    # ['', 'sites', '<domain>', ...]
    if len(parts) < 3:
        return None

    domain = (parts[2] or '').strip().lower()
    return domain or None


def _is_internal_site_referrer(request, domain: str) -> bool:
    """
    Detecta navegación interna del mismo sitio desplegado.
    Si el referer ya pertenece a /sites/<domain>/..., no se considera nueva visita.
    """
    referrer = request.META.get('HTTP_REFERER', '')
    if not referrer:
        return False

    parsed = urlparse(referrer)
    ref_path = parsed.path or ''
    expected_prefix = f'/sites/{domain}/'
    expected_exact = f'/sites/{domain}'

    return ref_path == expected_exact or ref_path.startswith(expected_prefix)


def serve_site_file(request, domain, file_path='index.html'):
    """
    Sirve archivos estáticos del sitio desplegado en /media/sites/<domain>/.
    Solo expone deployments activos y protege contra path traversal.
    """
    deployment = Deployment.objects.filter(
        domain=domain,
        status=Deployment.Status.ACTIVE,
        deleted_at__isnull=True,
    ).first()

    if not deployment:
        raise Http404('Sitio no encontrado o inactivo.')

    site_root = Path(settings.MEDIA_ROOT) / 'sites' / domain
    if not site_root.exists() or not site_root.is_dir():
        raise Http404('El sitio no tiene archivos publicados.')

    # Algunos ZIP vienen con una carpeta contenedora única.
    # Si no hay index en raíz, usar esa carpeta como raíz efectiva del sitio.
    effective_root = site_root
    root_index = site_root / 'index.html'
    if not root_index.exists():
        child_dirs = [p for p in site_root.iterdir() if p.is_dir()]
        if len(child_dirs) == 1 and (child_dirs[0] / 'index.html').exists():
            effective_root = child_dirs[0]

    safe_relative = file_path or 'index.html'
    target_path = (effective_root / safe_relative).resolve()

    try:
        target_path.relative_to(effective_root.resolve())
    except ValueError as exc:
        raise Http404('Ruta inválida.') from exc

    if target_path.is_dir():
        target_path = target_path / 'index.html'

    if not target_path.exists() or not target_path.is_file():
        # Fallback útil para rutas de SPA; no afecta sitios estáticos simples.
        spa_index = effective_root / 'index.html'
        if spa_index.exists() and spa_index.is_file():
            target_path = spa_index
        else:
            raise Http404('Archivo no encontrado.')

    content_type, _ = mimetypes.guess_type(str(target_path))
    # Regla de negocio de visitas:
    # - Solo cuenta páginas HTML del sitio publicado (/sites/<domain>/...).
    # - No cuenta navegación interna por el propio sitio (header/menu interno).
    # - No cuenta navegación interna del panel admin ni scroll/interacciones del frontend.
    if target_path.suffix.lower() in {'.html', '.htm'}:
        # Siempre registrar la vista de página para el historial.
        # Nota: en sitios SPA, la navegación interna (sin recargar) no genera solicitudes
        # al backend, por lo que solo se registran cargas reales de ruta.
        log_request(request, 'SITE_PAGE_VIEW', 200, user_id=deployment.user_id)

        # Contador de tráfico: solo cuenta entradas al sitio, no navegación interna.
        if not _is_internal_site_referrer(request, domain):
            deployment.traffic_visit_count = (deployment.traffic_visit_count or 0) + 1
            deployment.save(update_fields=['traffic_visit_count', 'updated_at'])
            log_request(request, 'SITE_VISIT', 200, user_id=deployment.user_id)

    return FileResponse(target_path.open('rb'), content_type=content_type or 'application/octet-stream')

# ---------------------------------------------------------------------------
# Listar y crear deployments del usuario autenticado
# ---------------------------------------------------------------------------

class DeploymentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Deployment.objects.filter(
            user=request.user,
            deleted_at__isnull=True,
        )

        status_filter = request.query_params.get('status')
        if status_filter:
            valid_statuses = [s.value for s in Deployment.Status]
            if status_filter not in valid_statuses:
                return error_response(
                    message='Filtro de estado inválido.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        paginator = _DefaultPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = DeploymentOutputSerializer(page, many=True)
        log_request(request, 'USER_LIST_DEPLOYMENTS', 200)
        return _paginated_success_response(
            paginator=paginator,
            key='deployments',
            items=serializer.data,
            message='Despliegues obtenidos correctamente.',
        )

    def post(self, request):
        # El usuario debe tener una suscripción activa para crear deployments
        active_plan = UserPlan.objects.filter(
            user=request.user,
            status=UserPlan.Status.ACTIVE,
            deleted_at__isnull=True,
        ).select_related('plan').first()

        if not active_plan:
            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 403)
            return error_response(
                message='Necesitas una suscripción activa para crear un despliegue.',
                status=403,
            )

        # Regla de negocio: un deployment SIEMPRE nace con ZIP (una sola llamada).
        # Se recibe multipart con: domain + zip_file.
        zip_file = request.FILES.get('zip_file')
        if not zip_file:
            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 400)
            return error_response(
                message='Adjunta un archivo ZIP para continuar.',
                status=400,
            )

        serializer = DeploymentCreateSerializer(
            data=request.data,
            context={'request': request, 'user': request.user},
        )
        if not serializer.is_valid():
            logger.info(
                'Validación fallida al crear deployment. user_id=%s errors=%s',
                getattr(request.user, 'pk', None),
                serializer.errors,
            )

            error_message = 'Datos inválidos. Revisa la información e inténtalo de nuevo.'
            errors = serializer.errors

            if isinstance(errors, dict) and errors:
                # Si el error es por el dominio (dato del usuario), podemos mostrarlo sin exponer estructura interna.
                domain_error = errors.get('domain')
                if isinstance(domain_error, (list, tuple)) and domain_error:
                    error_message = str(domain_error[0])
                elif domain_error:
                    error_message = str(domain_error)
            elif isinstance(errors, (list, tuple)) and errors:
                error_message = str(errors[0])

            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 400)
            return error_response(
                message=error_message,
                status=400,
            )

        domain = serializer.validated_data['domain']

        try:
            deployment = deploy_zip_as_new_deployment(
                user=request.user,
                domain=domain,
                zip_file=zip_file,
                active_plan=active_plan,
            )
        except ZipValidationError as e:
            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 400)
            return error_response(message=str(e), status=400)
        except Exception:
            logger.exception(
                'Error inesperado al procesar ZIP. user_id=%s domain=%r',
                getattr(request.user, 'pk', None),
                domain,
            )
            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 500)
            return error_response(
                message='Error al procesar el archivo ZIP.',
                status=500,
            )

        if deployment.status == Deployment.Status.FAILED:
            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 500)
            return error_response(
                message='El despliegue falló al procesar el ZIP. Se registró el intento en el historial.',
                data={
                    'id': deployment.id,
                    'deployment_domain': deployment.domain,
                    'site_url': deployment.site_url,
                    'version_number': deployment.version_number,
                    'disk_used_mb': deployment.disk_used_mb,
                    'status': deployment.status,
                    'created_at': deployment.created_at,
                },
                status=500,
            )

        log_request(request, 'USER_CREATE_DEPLOYMENT', 201)
        return success_response(
            data={
                'id': deployment.id,
                'deployment_domain': deployment.domain,
                'site_url': deployment.site_url,
                'version_number': deployment.version_number,
                'disk_used_mb': deployment.disk_used_mb,
                'status': deployment.status,
                'created_at': deployment.created_at,
            },
            message=f'Despliegue creado y versión {deployment.version_number} subida correctamente.',
            status=201,
        )


# ---------------------------------------------------------------------------
# Detalle, actualizar y eliminar un deployment del usuario autenticado
# ---------------------------------------------------------------------------

class DeploymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_deployment(self, pk, user):
        try:
            return Deployment.objects.get(pk=pk, user=user, deleted_at__isnull=True)
        except Deployment.DoesNotExist:
            return None

    def get(self, request, pk):
        deployment = self._get_deployment(pk, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        log_request(request, 'USER_GET_DEPLOYMENT', 200)
        return success_response(
            data=DeploymentOutputSerializer(deployment).data,
            message='Despliegue obtenido correctamente.',
        )

    def put(self, request, pk):
        deployment = self._get_deployment(pk, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        serializer = DeploymentUpdateSerializer(
            data=request.data,
            context={'instance': deployment, 'user': request.user, 'request': request},
        )
        if not serializer.is_valid():
            logger.info(
                'Validación fallida al actualizar deployment. user_id=%s deployment_id=%s errors=%s',
                getattr(request.user, 'pk', None),
                pk,
                serializer.errors,
            )
            log_request(request, 'USER_UPDATE_DEPLOYMENT_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                status=400,
            )

        data = serializer.validated_data

        if 'status' in data:
            deployment.status = data['status']
            deployment.save(update_fields=['status', 'updated_at'])

        log_request(request, 'USER_UPDATE_DEPLOYMENT', 200)
        return success_response(
            data=DeploymentOutputSerializer(deployment).data,
            message='Despliegue actualizado correctamente.',
        )

    def delete(self, request, pk):
        deployment = self._get_deployment(pk, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        # Regla de negocio: no existe “eliminar”; solo inactivar.
        if deployment.status != Deployment.Status.INACTIVE:
            deployment.status = Deployment.Status.INACTIVE
            deployment.save(update_fields=['status', 'updated_at'])

        log_request(request, 'USER_INACTIVATE_DEPLOYMENT', 200)
        return success_response(message='Despliegue inactivado correctamente.')


class DeploymentLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        deployment = Deployment.objects.filter(
            pk=pk,
            user=request.user,
            deleted_at__isnull=True,
        ).first()
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        prefix = f'/sites/{deployment.domain}/'
        qs = SystemLog.objects.filter(
            user_id=request.user.pk,
            action='SITE_PAGE_VIEW',
            request_path__startswith=prefix,
        ).order_by('-created_at')

        qs = _apply_text_search(qs, request.query_params.get('q'), [
            'request_path__icontains',
            'ip_address__icontains',
        ])

        paginator = _DefaultPagination()
        page = paginator.paginate_queryset(qs, request)

        logs = [
            _serialize_site_log_item(
                item=item,
                domain=deployment.domain,
                deployment_id=deployment.id,
            )
            for item in page
        ]

        log_request(request, 'USER_GET_DEPLOYMENT_LOGS', 200)
        return _paginated_success_response(
            paginator=paginator,
            key='logs',
            items=logs,
            message='Registros del despliegue obtenidos correctamente.',
        )


class UserDeploymentLogsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SystemLog.objects.filter(
            user_id=request.user.pk,
            action='SITE_PAGE_VIEW',
            request_path__startswith='/sites/',
        ).order_by('-created_at')

        domain = (request.query_params.get('domain') or '').strip().lower()
        if domain:
            qs = qs.filter(request_path__startswith=f'/sites/{domain}/')

        qs = _apply_text_search(qs, request.query_params.get('q'), [
            'request_path__icontains',
            'ip_address__icontains',
        ])

        paginator = _DefaultPagination()
        page = paginator.paginate_queryset(qs, request)

        logs = [
            _serialize_site_log_item(
                item=item,
                domain=_extract_domain_from_site_path(item.request_path),
            )
            for item in page
        ]

        log_request(request, 'USER_GET_MY_DEPLOYMENT_LOGS', 200)
        return _paginated_success_response(
            paginator=paginator,
            key='logs',
            items=logs,
            message='Registros obtenidos correctamente.',
        )


class DeploymentTrafficView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = request.query_params.get('days', '7')
        deployment_id = request.query_params.get('deployment_id')
        try:
            days_int = max(1, min(int(days), 90))
        except ValueError:
            days_int = 7

        deployments_qs = Deployment.objects.filter(
            user=request.user,
            deleted_at__isnull=True,
        )

        if deployment_id:
            try:
                deployment_id_int = int(deployment_id)
            except ValueError:
                return error_response(message='Parámetro inválido.', status=400)

            deployments_qs = deployments_qs.filter(pk=deployment_id_int)

        domains = list(deployments_qs.values_list('domain', flat=True).distinct())

        if not domains:
            return success_response(
                data={'traffic': []},
                message='Sin datos de tráfico.',
            )

        logs_qs = SystemLog.objects.filter(
            user_id=request.user.pk,
            action='SITE_VISIT',
        )

        # Incluir únicamente rutas de los dominios del usuario.
        prefixes = [f'/sites/{d}/' for d in domains]
        path_filter = Q()
        for prefix in prefixes:
            path_filter |= Q(request_path__startswith=prefix)

        logs_qs = logs_qs.filter(path_filter)

        if not logs_qs.exists():
            return success_response(
                data={'traffic': []},
                message='Sin datos de tráfico.',
            )

        daily = (
            logs_qs
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(visits=Count('id'))
            .order_by('-day')[:days_int]
        )

        traffic = [
            {
                'date': row['day'],
                'visits': row['visits'],
            }
            for row in reversed(list(daily))
        ]

        log_request(request, 'USER_GET_TRAFFIC', 200)
        return success_response(
            data={'traffic': traffic},
            message='Visitas del sitio desplegado obtenidas correctamente.',
        )


# ---------------------------------------------------------------------------
# Versiones / historial (legacy path: /api/deployment-versions/...)
# ---------------------------------------------------------------------------

def _get_deployment_for_user(deployment_id, user):
    try:
        return Deployment.objects.get(
            pk=deployment_id,
            user=user,
            deleted_at__isnull=True,
        )
    except Deployment.DoesNotExist:
        return None


class UploadVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, deployment_id):
        active_plan = (
            UserPlan.objects.filter(
                user=request.user,
                status=UserPlan.Status.ACTIVE,
                deleted_at__isnull=True,
            )
            .select_related('plan')
            .first()
        )

        if not active_plan:
            log_request(request, 'UPLOAD_VERSION_FAILED', 403)
            return error_response(
                message='Necesitas una suscripción activa para subir versiones.',
                status=403,
            )

        zip_file = request.FILES.get('zip_file')
        if not zip_file:
            return error_response(
                message='Adjunta un archivo ZIP para continuar.',
                status=400,
            )

        domain = (request.data.get('domain') or '').strip().lower()
        if not domain:
            deployment = _get_deployment_for_user(deployment_id, request.user)
            if not deployment:
                return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)
            domain = deployment.domain

        try:
            deployment = deploy_zip_as_new_deployment(
                user=request.user,
                domain=domain,
                zip_file=zip_file,
                active_plan=active_plan,
            )
        except ZipValidationError as e:
            log_request(request, 'UPLOAD_VERSION_FAILED', 400)
            return error_response(message=str(e), status=400)
        except Exception:
            log_request(request, 'UPLOAD_VERSION_FAILED', 500)
            return error_response(
                message='Error al procesar el archivo ZIP.',
                status=500,
            )

        if deployment.status == Deployment.Status.FAILED:
            log_request(request, 'UPLOAD_VERSION_FAILED', 500)
            return error_response(
                message='La versión falló al procesar el ZIP. Se registró el intento en el historial.',
                data={
                    'id': deployment.id,
                    'deployment_domain': deployment.domain,
                    'version_number': deployment.version_number,
                    'disk_used_mb': deployment.disk_used_mb,
                    'status': deployment.status,
                    'created_at': deployment.created_at,
                },
                status=500,
            )

        log_request(request, 'UPLOAD_VERSION', 201)
        return success_response(
            data={
                'id': deployment.id,
                'deployment_domain': deployment.domain,
                'version_number': deployment.version_number,
                'disk_used_mb': deployment.disk_used_mb,
                'status': deployment.status,
                'created_at': deployment.created_at,
            },
            message=f'Versión {deployment.version_number} subida correctamente.',
            status=201,
        )


class VersionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, deployment_id):
        deployment = _get_deployment_for_user(deployment_id, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        qs = (
            Deployment.objects.filter(
                user=request.user,
                domain=deployment.domain,
                deleted_at__isnull=True,
            )
            .order_by('-version_number', '-created_at')
        )

        paginator = _DefaultPagination()
        page = paginator.paginate_queryset(qs, request)

        versions = [
            {
                'id': item.id,
                'deployment_domain': item.domain,
                'version_number': item.version_number,
                'disk_used_mb': item.disk_used_mb,
                'status': item.status,
                'created_at': item.created_at,
            }
            for item in page
        ]

        log_request(request, 'LIST_VERSIONS', 200)
        return success_response(
            data={
                'total': paginator.page.paginator.count,
                'pagina': paginator.page.number,
                'paginas': paginator.page.paginator.num_pages,
                'versions': versions,
            },
            message='Historial de versiones obtenido correctamente.',
        )


class VersionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, deployment_id, pk):
        deployment = _get_deployment_for_user(deployment_id, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        try:
            version = Deployment.objects.get(
                pk=pk,
                user=request.user,
                domain=deployment.domain,
                deleted_at__isnull=True,
            )
        except Deployment.DoesNotExist:
            return error_response(message='Versión no encontrada.', status=404)

        if not version.zip_path:
            return error_response(message='Versión no encontrada.', status=404)

        log_request(request, 'GET_VERSION', 200)
        return success_response(
            data={
                'id': version.id,
                'deployment_domain': version.domain,
                'version_number': version.version_number,
                'disk_used_mb': version.disk_used_mb,
                'status': version.status,
                'created_at': version.created_at,
            },
            message='Versión obtenida correctamente.',
        )


class RollbackVersionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, deployment_id, pk):
        deployment = _get_deployment_for_user(deployment_id, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        try:
            target_version = Deployment.objects.get(
                pk=pk,
                user=request.user,
                domain=deployment.domain,
                deleted_at__isnull=True,
            )
        except Deployment.DoesNotExist:
            return error_response(message='Versión no encontrada.', status=404)

        if not target_version.zip_path:
            return error_response(message='Versión no encontrada.', status=404)

        if target_version.status == Deployment.Status.ACTIVE:
            return error_response(
                message='Esta versión ya está activa.',
                status=400,
            )

        if target_version.status not in (Deployment.Status.REPLACED, Deployment.Status.INACTIVE):
            return error_response(
                message='Esta versión no se puede restaurar.',
                status=400,
            )

        media_root = Path(settings.MEDIA_ROOT)
        zip_abs_path = media_root / target_version.zip_path

        if not zip_abs_path.exists():
            log_request(request, 'ROLLBACK_VERSION_FAILED', 500)
            return error_response(
                message='No se pudo restaurar esta versión porque no está disponible. Sube la versión de nuevo e inténtalo otra vez.',
                status=500,
            )

        # Solo reemplaza lo ACTIVO del mismo dominio
        Deployment.objects.filter(
            user=request.user,
            domain=target_version.domain,
            deleted_at__isnull=True,
            status=Deployment.Status.ACTIVE,
        ).update(status=Deployment.Status.REPLACED)

        try:
            extract_zip_to_site(zip_abs_path, target_version.domain, media_root)
        except Exception:
            logger.exception(
                'Error restaurando versión. user_id=%s domain=%r version_id=%s',
                getattr(request.user, 'pk', None),
                target_version.domain,
                pk,
            )
            log_request(request, 'ROLLBACK_VERSION_FAILED', 500)
            return error_response(
                message='Error al restaurar los archivos del sitio.',
                status=500,
            )

        # Conserva traffic_visit_count y vuelve a incrementarse desde aquí.
        target_version.status = Deployment.Status.ACTIVE
        target_version.save(update_fields=['status', 'updated_at'])

        log_request(request, 'ROLLBACK_VERSION', 200)
        return success_response(
            data={
                'id': target_version.id,
                'deployment_domain': target_version.domain,
                'version_number': target_version.version_number,
                'disk_used_mb': target_version.disk_used_mb,
                'status': target_version.status,
                'created_at': target_version.created_at,
            },
            message=f'Restauración a la versión {target_version.version_number} realizada correctamente.',
        )


# ---------------------------------------------------------------------------
# Admin – listar todos los deployments
# ---------------------------------------------------------------------------

class AdminDeploymentListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = Deployment.objects.select_related('user').filter(deleted_at__isnull=True)

        status_filter = request.query_params.get('status')
        user_filter   = request.query_params.get('user_id')

        if status_filter:
            valid_statuses = [s.value for s in Deployment.Status]
            if status_filter not in valid_statuses:
                return error_response(
                    message='Filtro de estado inválido.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        if user_filter:
            qs = qs.filter(user_id=user_filter)

        qs = _apply_text_search(qs, request.query_params.get('q'), [
            'domain__icontains',
            'user__email__icontains',
            'user__first_name__icontains',
            'user__last_name__icontains',
        ])

        paginator = _DefaultPagination()
        page = paginator.paginate_queryset(qs, request)

        serializer = AdminDeploymentOutputSerializer(page, many=True)
        log_request(request, 'ADMIN_LIST_DEPLOYMENTS', 200)
        return _paginated_success_response(
            paginator=paginator,
            key='deployments',
            items=serializer.data,
            message='Despliegues obtenidos correctamente.',
        )


class AdminDeploymentStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def put(self, request, pk):
        deployment = Deployment.objects.select_related('user').filter(
            pk=pk,
            deleted_at__isnull=True,
        ).first()

        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        next_status = (request.data.get('status') or '').strip().lower()

        # Regla de negocio admin (UX): el botón stop bloquea SOLO si está activo.
        if next_status != Deployment.Status.BLOCKED:
            return error_response(
                message='Acción no válida.',
                status=400,
            )

        if deployment.status != Deployment.Status.ACTIVE:
            return error_response(
                message='Solo puedes bloquear un despliegue cuando está activo.',
                status=400,
            )

        deployment.status = Deployment.Status.BLOCKED
        deployment.save(update_fields=['status', 'updated_at'])

        log_request(request, 'ADMIN_BLOCK_DEPLOYMENT', 200, user_id=request.user.pk)
        return success_response(
            data=AdminDeploymentOutputSerializer(deployment).data,
            message='Despliegue bloqueado correctamente.',
        )
    
