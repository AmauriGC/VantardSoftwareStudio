from django.conf import settings
import mimetypes
from pathlib import Path
from django.http import FileResponse, Http404
from django.db.models import Count
from django.db.models.functions import TruncDate
from urllib.parse import urlparse

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from users.permissions import IsAdminUser
from user_plans.models import UserPlan
from system_logs.models import SystemLog
from system_logs.utils import log_request
from kernel.responses import success_response, error_response

DEPLOYMENT_NOT_FOUND = 'Deployment no encontrado.'

from .models import Deployment
from .utils import generate_site_url
from .serializers import ( DeploymentCreateSerializer, DeploymentUpdateSerializer, DeploymentOutputSerializer, AdminDeploymentOutputSerializer, )


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

    return ref_path.startswith(expected_prefix)


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
        if not _is_internal_site_referrer(request, domain):
            deployment.traffic_visit_count = (deployment.traffic_visit_count or 0) + 1
            deployment.save(update_fields=['traffic_visit_count', 'updated_at'])
            log_request(request, 'SITE_VISIT', 200, user_id=deployment.user_id)

    return FileResponse(open(target_path, 'rb'), content_type=content_type or 'application/octet-stream')

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
                    message=f'Status inválido. Valores permitidos: {", ".join(valid_statuses)}.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = DeploymentOutputSerializer(page, many=True)
        log_request(request, 'USER_LIST_DEPLOYMENTS', 200)
        return success_response(
            data={
                'total':       paginator.page.paginator.count,
                'pagina':      paginator.page.number,
                'paginas':     paginator.page.paginator.num_pages,
                'deployments': serializer.data,
            },
            message='Deployments obtenidos correctamente.',
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
                message='Necesitas una suscripción activa para crear un deployment.',
                status=403,
            )

        serializer = DeploymentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            error_message = 'Datos inválidos.'
            errors = serializer.errors

            if isinstance(errors, dict) and errors:
                first_key = next(iter(errors.keys()))
                first_error = errors.get(first_key)
                if isinstance(first_error, (list, tuple)) and first_error:
                    error_message = str(first_error[0])
                elif first_error:
                    error_message = str(first_error)
            elif isinstance(errors, (list, tuple)) and errors:
                error_message = str(errors[0])

            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 400)
            return error_response(
                message=error_message,
                data=serializer.errors,
                status=400,
            )

        domain   = serializer.validated_data['domain']
        site_url = generate_site_url(domain, settings.DEPLOYMENT_BASE_URL)

        deployment = Deployment.objects.create(
            user     = request.user,
            domain   = domain,
            site_url = site_url,
            status   = Deployment.Status.ACTIVE,
        )

        log_request(request, 'USER_CREATE_DEPLOYMENT', 201)
        return success_response(
            data=DeploymentOutputSerializer(deployment).data,
            message='Deployment creado correctamente.',
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
            message='Deployment obtenido correctamente.',
        )

    def put(self, request, pk):
        deployment = self._get_deployment(pk, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

        serializer = DeploymentUpdateSerializer(
            data=request.data,
            context={'instance': deployment},
        )
        if not serializer.is_valid():
            log_request(request, 'USER_UPDATE_DEPLOYMENT_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        data = serializer.validated_data

        if 'domain' in data:
            new_domain       = data['domain']
            deployment.domain   = new_domain
            deployment.site_url = generate_site_url(new_domain, settings.DEPLOYMENT_BASE_URL)

        if 'status' in data:
            deployment.status = data['status']

        deployment.save(update_fields=[
            *(['domain', 'site_url'] if 'domain' in data else []),
            *(['status'] if 'status' in data else []),
            'updated_at',
        ])

        log_request(request, 'USER_UPDATE_DEPLOYMENT', 200)
        return success_response(
            data=DeploymentOutputSerializer(deployment).data,
            message='Deployment actualizado correctamente.',
        )

    def delete(self, request, pk):
        deployment = self._get_deployment(pk, request.user)
        if not deployment:
            return error_response(message=DEPLOYMENT_NOT_FOUND, status=404)

          # Archivar todas las versiones activas antes de hacer soft delete
        from deployment_version.models import DeploymentVersion
        deployment.versions.filter(
            status=DeploymentVersion.Status.ACTIVE,
            deleted_at__isnull=True,
        ).update(status=DeploymentVersion.Status.REPLACED)

        deployment.soft_delete()
        log_request(request, 'USER_DELETE_DEPLOYMENT', 200)
        return success_response(message='Deployment eliminado correctamente.')


class DeploymentLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        deployment = Deployment.objects.filter(
            pk=pk,
            user=request.user,
            deleted_at__isnull=True,
        ).first()
        if not deployment:
            return error_response(message='Deployment no encontrado.', status=404)

        prefix = f'/sites/{deployment.domain}/'
        logs_qs = SystemLog.objects.filter(
            user_id=request.user.pk,
            action='SITE_VISIT',
            request_path__startswith=prefix,
        ).order_by('-created_at')[:200]

        logs = [
            {
                'id': item.id,
                'deployment_id': deployment.id,
                'path': item.request_path,
                'method': item.http_method,
                'client_ip': item.ip_address,
                'status_code': item.status_code,
                'created_at': item.created_at,
            }
            for item in logs_qs
        ]

        log_request(request, 'USER_GET_DEPLOYMENT_LOGS', 200)
        return success_response(
            data={'logs': logs},
            message='Logs del deployment obtenidos correctamente.',
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
                return error_response(message='deployment_id inválido.', status=400)

            deployments_qs = deployments_qs.filter(pk=deployment_id_int)

        domains = list(deployments_qs.values_list('domain', flat=True))

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
        domain_prefixes = [f'/sites/{d}/' for d in domains]
        filtered_ids = []
        for prefix in domain_prefixes:
            filtered_ids.extend(list(logs_qs.filter(request_path__startswith=prefix).values_list('id', flat=True)))

        if not filtered_ids:
            return success_response(
                data={'traffic': []},
                message='Sin datos de tráfico.',
            )

        daily = (
            SystemLog.objects.filter(id__in=filtered_ids)
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
                    message=f'Status inválido. Valores permitidos: {", ".join(valid_statuses)}.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        if user_filter:
            qs = qs.filter(user_id=user_filter)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = AdminDeploymentOutputSerializer(page, many=True)
        log_request(request, 'ADMIN_LIST_DEPLOYMENTS', 200)
        return success_response(
            data={
                'total':       paginator.page.paginator.count,
                'pagina':      paginator.page.number,
                'paginas':     paginator.page.paginator.num_pages,
                'deployments': serializer.data,
            },
            message='Deployments obtenidos correctamente.',
        )
    
