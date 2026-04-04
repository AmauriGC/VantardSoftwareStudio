from django.conf import settings

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from users.permissions import IsAdminUser
from user_plans.models import UserPlan
from system_logs.utils import log_request
from kernel.responses import success_response, error_response

DEPLOYMENT_NOT_FOUND = 'Deployment no encontrado.'

from .models import Deployment
from .utils import generate_site_url
from .serializers import ( DeploymentCreateSerializer, DeploymentUpdateSerializer, DeploymentOutputSerializer, AdminDeploymentOutputSerializer, )

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
            log_request(request, 'USER_CREATE_DEPLOYMENT_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
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
    
