from rest_framework import serializers
from .models import PlanChangeRequest
from plans.models import Plan
from user_plans.models import UserPlan


  # ---------------------------------------------------------------------------
  # Crear solicitud (entrada)
  # ---------------------------------------------------------------------------

class CreatePlanChangeRequestSerializer(serializers.Serializer):
    requested_plan_id = serializers.IntegerField()
    months            = serializers.IntegerField(
        min_value=1,
        max_value=12,
        error_messages={
            'min_value': 'Asegúrese de que este valor es mayor o igual a 1',
            'max_value': 'Asegúrese de que este valor es menor o igual a 12',
        },
    )
    reason            = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user = self.context['request'].user

        # El usuario debe tener un plan activo para solicitar un cambio
        active_plan = UserPlan.objects.filter(
            user=user,
            status=UserPlan.Status.ACTIVE,
            deleted_at__isnull=True,
        ).first()
        if not active_plan:
            raise serializers.ValidationError('No tienes una suscripción activa para cambiar.')

        # No puede tener una solicitud pendiente o aprobada al mismo tiempo
        has_pending = PlanChangeRequest.objects.filter(
            user=user,
            status__in=[PlanChangeRequest.StatusChoices.PENDING, PlanChangeRequest.StatusChoices.APPROVED],
            deleted_at__isnull=True,
        ).exists()
        if has_pending:
            raise serializers.ValidationError('Ya tienes una solicitud de cambio de plan en proceso.')
        
        # Calcula el total en backend para evitar manipulaciones desde el front.
        try:
            plan = Plan.objects.get(
                pk=attrs['requested_plan_id'],
                status=Plan.StatusChoices.ACTIVE,
                deleted_at__isnull=True,
            )
        except Plan.DoesNotExist:
            raise serializers.ValidationError('El plan seleccionado no existe')

        months = attrs.get('months')
        if months is None:
            raise serializers.ValidationError('Debes indicar el número de meses.')

        # Validación de almacenamiento: bloquear si el uso actual supera el límite del nuevo plan.
        from django.db.models import Sum
        from deployments.models import Deployment
        used_disk_mb = (
            Deployment.objects.filter(
                user=user,
                deleted_at__isnull=True,
            ).aggregate(total=Sum('disk_used_mb'))['total'] or 0
        )
        if used_disk_mb > plan.max_disk_mb:
            raise serializers.ValidationError(
                f'No puedes cambiar a este plan: tienes {used_disk_mb} MB en uso '
                f'y el plan "{plan.name}" solo permite {plan.max_disk_mb} MB. '
                f'Libera espacio o elige un plan con mayor almacenamiento.'
            )

        total = UserPlan.calculate_total(float(plan.price), int(months))

        attrs['current_plan']     = active_plan
        attrs['months_requested'] = int(months)
        attrs['total_price']      = total
        return attrs


  # ---------------------------------------------------------------------------
  # Detalle de solicitud (salida)
  # ---------------------------------------------------------------------------

class PlanChangeRequestOutputSerializer(serializers.ModelSerializer):
    current_plan_name   = serializers.CharField(source='current_plan.plan.name')
    requested_plan_name = serializers.CharField(source='requested_plan.name')
    reviewed_by_email   = serializers.SerializerMethodField()
    months              = serializers.IntegerField(
        source='months_requested', read_only=True, allow_null=True
    )
    total_price         = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model  = PlanChangeRequest
        fields = [
            'id',
            'current_plan_name',
            'requested_plan_name',
            'months',
            'total_price',
            'reason',
            'status',
            'reviewed_by_email',
            'reviewed_at',
            'completed_at',
            'created_at',
        ]

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None


  # ---------------------------------------------------------------------------
  # Admin – listado con datos del usuario (salida)
  # ---------------------------------------------------------------------------

class AdminPlanChangeRequestOutputSerializer(serializers.ModelSerializer):
    user_email          = serializers.EmailField(source='user.email')
    user_name           = serializers.SerializerMethodField()
    current_plan_name   = serializers.CharField(source='current_plan.plan.name')
    requested_plan_name = serializers.CharField(source='requested_plan.name')
    reviewed_by_email   = serializers.SerializerMethodField()
    months              = serializers.IntegerField(
        source='months_requested', read_only=True, allow_null=True
    )
    total_price         = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model  = PlanChangeRequest
        fields = [
            'id',
            'user_email',
            'user_name',
            'current_plan_name',
            'requested_plan_name',
            'months',
            'total_price',
            'reason',
            'status',
            'reviewed_by_email',
            'reviewed_at',
            'completed_at',
            'created_at',
        ]

    def get_user_name(self, obj):
        return obj.user.full_name

    def get_reviewed_by_email(self, obj):
        return obj.reviewed_by.email if obj.reviewed_by else None