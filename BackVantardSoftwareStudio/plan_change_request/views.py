from django.utils import timezone
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from users.permissions import IsAdminUser
from user_plans.models import UserPlan
from plans.models import Plan
from system_logs.utils import log_request
from kernel.responses import success_response, error_response

from .models import PlanChangeRequest
from .serializers import ( CreatePlanChangeRequestSerializer, PlanChangeRequestOutputSerializer, AdminPlanChangeRequestOutputSerializer, )

  # ---------------------------------------------------------------------------
  # Crear solicitud de cambio de plan
  # ---------------------------------------------------------------------------

class CreatePlanChangeRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePlanChangeRequestSerializer(
            data=request.data,
            context={'request': request},
        )
        if not serializer.is_valid():
            error_message = 'Datos inválidos.'
            errors = serializer.errors

            # Prioriza el primer mensaje real de validación para UX más clara.
            if isinstance(errors, dict) and errors:
                first_key = next(iter(errors.keys()))
                first_error = errors.get(first_key)
                if isinstance(first_error, (list, tuple)) and first_error:
                    error_message = str(first_error[0])
                elif first_error:
                    error_message = str(first_error)
            elif isinstance(errors, (list, tuple)) and errors:
                error_message = str(errors[0])

            log_request(request, 'PLAN_CHANGE_REQUEST_FAILED', 400)
            return error_response(
                message=error_message,
                data=serializer.errors,
                status=400,
            )

        data = serializer.validated_data
        change_request = PlanChangeRequest.objects.create(
            user           = request.user,
            current_plan   = data['current_plan'],
            requested_plan = Plan.objects.get(pk=data['requested_plan_id']),
            reason         = data.get('reason', ''),
            status         = PlanChangeRequest.Status.PENDING,
        )

        log_request(request, 'PLAN_CHANGE_REQUEST_CREATED', 201)
        return success_response(
            data=PlanChangeRequestOutputSerializer(change_request).data,
            message='Solicitud de cambio de plan enviada correctamente.',
            status=201,
        )


  # ---------------------------------------------------------------------------
  # Mis solicitudes
  # ---------------------------------------------------------------------------

class MyPlanChangeRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PlanChangeRequest.objects.filter(
            user=request.user,
            deleted_at__isnull=True,
        ).select_related('current_plan__plan', 'requested_plan', 'reviewed_by')

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = PlanChangeRequestOutputSerializer(page, many=True)
        log_request(request, 'PLAN_CHANGE_REQUEST_LIST', 200)
        return success_response(
            data={
                'total':      paginator.page.paginator.count,
                'pagina':     paginator.page.number,
                'paginas':    paginator.page.paginator.num_pages,
                'solicitudes': serializer.data,
            },
            message='Solicitudes obtenidas correctamente.',
        )


  # ---------------------------------------------------------------------------
  # Cancelar solicitud pendiente
  # ---------------------------------------------------------------------------

class CancelPlanChangeRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            change_request = PlanChangeRequest.objects.get(
                pk=pk,
                user=request.user,
                deleted_at__isnull=True,
            )
        except PlanChangeRequest.DoesNotExist:
            return error_response(
                message='Solicitud no encontrada.',
                status=404,
            )

        if not change_request.is_pending:
            return error_response(
                message='Solo puedes cancelar solicitudes en estado pendiente.',
                status=400,
            )

        change_request.soft_delete()
        log_request(request, 'PLAN_CHANGE_REQUEST_CANCELLED', 200)
        return success_response(message='Solicitud cancelada correctamente.')


  # ---------------------------------------------------------------------------
  # Admin – listar todas las solicitudes
  # ---------------------------------------------------------------------------

class AdminPlanChangeRequestListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = PlanChangeRequest.objects.select_related(
            'user', 'current_plan__plan', 'requested_plan', 'reviewed_by'
        ).filter(deleted_at__isnull=True)

        status_filter = request.query_params.get('status')
        if status_filter:
            valid_statuses = [s.value for s in PlanChangeRequest.Status]
            if status_filter not in valid_statuses:
                return error_response(
                    message=f'Status inválido. Valores permitidos: {", ".join(valid_statuses)}.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = AdminPlanChangeRequestOutputSerializer(page, many=True)
        log_request(request, 'ADMIN_LIST_PLAN_CHANGE_REQUESTS', 200)
        return success_response(
            data={
                'total':      paginator.page.paginator.count,
                'pagina':     paginator.page.number,
                'paginas':    paginator.page.paginator.num_pages,
                'solicitudes': serializer.data,
            },
            message='Solicitudes obtenidas correctamente.',
        )


  # ---------------------------------------------------------------------------
  # Admin – aprobar solicitud (aplica el cambio de plan automáticamente)
  # ---------------------------------------------------------------------------

class AdminApprovePlanChangeRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        try:
            change_request = PlanChangeRequest.objects.select_related(
                'current_plan', 'requested_plan', 'user'
            ).get(pk=pk, deleted_at__isnull=True)
        except PlanChangeRequest.DoesNotExist:
            return error_response(message='Solicitud no encontrada.', status=404)

        if not change_request.is_pending:
            return error_response(
                message='Solo se pueden aprobar solicitudes en estado pendiente.',
                status=400,
            )

          # 1. Aprobar la solicitud
        change_request.approve(request.user)

          # 2. Cancelar el plan activo actual del usuario
        change_request.current_plan.soft_delete()

          # 3. Crear el nuevo UserPlan con el plan solicitado
        now             = timezone.now()
        months          = change_request.current_plan.months_purchased
        expiration_date = now + timedelta(days=30 * months)
        total_price     = UserPlan.calculate_total(
            float(change_request.requested_plan.price), months
        )

        UserPlan.objects.create(
            user             = change_request.user,
            plan             = change_request.requested_plan,
            purchase_date    = now,
            expiration_date  = expiration_date,
            months_purchased = months,
            total_price_paid = total_price,
            status           = UserPlan.Status.ACTIVE,
        )

          # 4. Marcar la solicitud como completada
        change_request.complete()

        log_request(request, 'ADMIN_APPROVE_PLAN_CHANGE', 200)
        return success_response(
            data=AdminPlanChangeRequestOutputSerializer(change_request).data,
            message='Solicitud aprobada y plan actualizado correctamente.',
        )


  # ---------------------------------------------------------------------------
  # Admin – rechazar solicitud
  # ---------------------------------------------------------------------------

class AdminRejectPlanChangeRequestView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        try:
            change_request = PlanChangeRequest.objects.get(
                pk=pk, deleted_at__isnull=True
            )
        except PlanChangeRequest.DoesNotExist:
            return error_response(message='Solicitud no encontrada.', status=404)

        if not change_request.is_pending:
            return error_response(
                message='Solo se pueden rechazar solicitudes en estado pendiente.',
                status=400,
            )

        change_request.reject(request.user)
        log_request(request, 'ADMIN_REJECT_PLAN_CHANGE', 200)
        return success_response(
            data=AdminPlanChangeRequestOutputSerializer(change_request).data,
            message='Solicitud rechazada correctamente.',
        )

