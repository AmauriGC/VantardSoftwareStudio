from django.utils import timezone
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from plans.models import Plan
from users.permissions import IsAdminUser
from system_logs.utils import log_request
from kernel.responses import success_response, error_response

from .models import UserPlan
from .serializers import ( PurchasePlanSerializer, ActivePlanOutputSerializer, UserPlanHistoryOutputSerializer, AdminUserPlanOutputSerializer, )

  # ---------------------------------------------------------------------------
  # Comprar plan
  # ---------------------------------------------------------------------------

class PurchasePlanView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PurchasePlanSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'USER_PLAN_PURCHASE_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        data   = serializer.validated_data
        plan   = Plan.objects.get(pk=data['plan_id'])
        months = data['months_purchased']
        user   = request.user

          # Cancelar suscripción activa anterior si existe
        active_plan = UserPlan.objects.filter(
            user=user,
            status=UserPlan.Status.ACTIVE,
            deleted_at__isnull=True,
        ).first()

        if active_plan:
            active_plan.soft_delete()

          # Crear nueva suscripción
        now             = timezone.now()
        expiration_date = now + timedelta(days=30 * months)
        total_price     = UserPlan.calculate_total(float(plan.price), months)

        user_plan = UserPlan.objects.create(
            user             = user,
            plan             = plan,
            purchase_date    = now,
            expiration_date  = expiration_date,
            months_purchased = months,
            total_price_paid = total_price,
            status           = UserPlan.Status.ACTIVE,
        )

        log_request(request, 'USER_PLAN_PURCHASE', 201)
        return success_response(
            data=ActivePlanOutputSerializer(user_plan).data,
            message='Plan adquirido correctamente.',
            status=201,
        )

  # ---------------------------------------------------------------------------
  # Plan activo del usuario autenticado
  # ---------------------------------------------------------------------------

class ActivePlanView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_plan = UserPlan.objects.filter(
            user=request.user,
            status=UserPlan.Status.ACTIVE,
            deleted_at__isnull=True,
        ).select_related('plan').first()

        if not user_plan:
            log_request(request, 'USER_PLAN_GET_ACTIVE', 404)
            return error_response(
                message='No tienes una suscripción activa.',
                status=404,
            )

        log_request(request, 'USER_PLAN_GET_ACTIVE', 200)
        return success_response(
            data=ActivePlanOutputSerializer(user_plan).data,
            message='Suscripción activa obtenida correctamente.',
        )

  # ---------------------------------------------------------------------------
  # Historial de suscripciones del usuario autenticado
  # ---------------------------------------------------------------------------

class UserPlanHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = UserPlan.objects.filter(
            user=request.user,
        ).select_related('plan').order_by('-purchase_date')

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = UserPlanHistoryOutputSerializer(page, many=True)
        log_request(request, 'USER_PLAN_LIST_HISTORY', 200)
        return success_response(
            data={
                'total':        paginator.page.paginator.count,
                'pagina':       paginator.page.number,
                'paginas':      paginator.page.paginator.num_pages,
                'suscripciones': serializer.data,
            },
            message='Historial de suscripciones obtenido correctamente.',
        )


  # ---------------------------------------------------------------------------
  # Cancelar suscripción activa
  # ---------------------------------------------------------------------------

class CancelPlanView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user_plan = UserPlan.objects.filter(
            user=request.user,
            status=UserPlan.Status.ACTIVE,
            deleted_at__isnull=True,
        ).first()

        if not user_plan:
            log_request(request, 'USER_PLAN_CANCEL_FAILED', 404)
            return error_response(
                message='No tienes una suscripción activa para cancelar.',
                status=404,
            )

        user_plan.soft_delete()
        log_request(request, 'USER_PLAN_CANCEL', 200)
        return success_response(message='Suscripción cancelada correctamente.')


  # ---------------------------------------------------------------------------
  # Admin – todas las suscripciones
  # ---------------------------------------------------------------------------

class AdminUserPlanListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = UserPlan.objects.select_related('user', 'plan').filter(
            deleted_at__isnull=True,
        )

        status_filter = request.query_params.get('status')
        plan_filter   = request.query_params.get('plan_id')

        if status_filter:
            valid_statuses = [s.value for s in UserPlan.Status]
            if status_filter not in valid_statuses:
                return error_response(
                    message=f'Status inválido. Valores permitidos: {", ".join(valid_statuses)}.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        if plan_filter:
            qs = qs.filter(plan_id=plan_filter)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = AdminUserPlanOutputSerializer(page, many=True)
        log_request(request, 'ADMIN_LIST_SUBSCRIPTIONS', 200)
        return success_response(
            data={
                'total':          paginator.page.paginator.count,
                'pagina':         paginator.page.number,
                'paginas':        paginator.page.paginator.num_pages,
                'suscripciones':  serializer.data,
            },
            message='Suscripciones obtenidas correctamente.',
        )

