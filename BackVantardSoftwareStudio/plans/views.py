from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Plan
from .serializers import (
    PlanOutputSerializer,
    PlanCreateSerializer,
    PlanUpdateSerializer,
)
from .permissions import IsAdminUser
from system_logs.utils import log_request
from kernel.responses import success_response, error_response


# ---------------------------------------------------------------------------
# Listado de planes activos (público)
# ---------------------------------------------------------------------------

class PlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(status=Plan.Status.ACTIVE, deleted_at__isnull=True)
        serializer = PlanOutputSerializer(plans, many=True)
        log_request(request, 'PLAN_LIST', 200)
        return success_response(
            data={'plans': serializer.data},
            message='Planes obtenidos correctamente.',
        )

    def post(self, request):
        # Solo admin puede crear
        if not (request.user and request.user.is_authenticated and request.user.is_admin):
            log_request(request, 'PLAN_CREATE_FORBIDDEN', 403)
            return error_response(
                message='No tienes permiso para realizar esta acción.',
                status=403,
            )

        serializer = PlanCreateSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'PLAN_CREATE_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        data = serializer.validated_data
        plan = Plan.objects.create(
            name=data['name'],
            price=data['price'],
            max_disk_mb=data['max_disk_mb'],
            status=data.get('status', Plan.Status.ACTIVE),
        )

        log_request(request, 'PLAN_CREATE', 201)
        return success_response(
            data=PlanOutputSerializer(plan).data,
            message='Plan creado correctamente.',
            status=201,
        )


# ---------------------------------------------------------------------------
# Detalle, actualización de un plan
# ---------------------------------------------------------------------------

class PlanDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def _get_plan(self, pk):
        try:
            return Plan.objects.get(pk=pk, deleted_at__isnull=True)
        except Plan.DoesNotExist:
            return None

    def get(self, request, pk):
        plan = self._get_plan(pk)
        if plan is None:
            return error_response(
                message=f'No se encontró un plan con id {pk}.',
                status=404,
            )
        log_request(request, 'PLAN_RETRIEVE', 200)
        return success_response(
            data=PlanOutputSerializer(plan).data,
            message='Plan obtenido correctamente.',
        )

    def put(self, request, pk):
        plan = self._get_plan(pk)
        if plan is None:
            return error_response(
                message=f'No se encontró un plan con id {pk}.',
                status=404,
            )

        serializer = PlanUpdateSerializer(
            data=request.data,
            context={'instance_id': plan.pk},
        )
        if not serializer.is_valid():
            log_request(request, 'PLAN_UPDATE_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        for field, value in serializer.validated_data.items():
            setattr(plan, field, value)
        plan.save(update_fields=[*serializer.validated_data.keys(), 'updated_at'])

        log_request(request, 'PLAN_UPDATE', 200)
        return success_response(
            data=PlanOutputSerializer(plan).data,
            message='Plan actualizado correctamente.',
        )
    