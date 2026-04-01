from rest_framework import serializers
from .models import UserPlan
from plans.models import Plan


  # ---------------------------------------------------------------------------
  # Comprar plan (entrada)
  # ---------------------------------------------------------------------------

class PurchasePlanSerializer(serializers.Serializer):
    plan_id          = serializers.IntegerField()
    months_purchased = serializers.IntegerField(min_value=1, max_value=24)

    def validate_plan_id(self, value):
        try:
            plan = Plan.objects.get(pk=value, status=Plan.Status.ACTIVE, deleted_at__isnull=True)
        except Plan.DoesNotExist:
            raise serializers.ValidationError('El plan no existe o no está disponible.')
        return value

    def validate_months_purchased(self, value):
        if value < 1:
            raise serializers.ValidationError('Debes comprar al menos 1 mes.')
        return value


  # ---------------------------------------------------------------------------
  # Suscripción activa (salida)
  # ---------------------------------------------------------------------------

class ActivePlanOutputSerializer(serializers.ModelSerializer):
    plan_name    = serializers.CharField(source='plan.name')
    plan_price   = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2)
    max_disk_mb  = serializers.IntegerField(source='plan.max_disk_mb')
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model  = UserPlan
        fields = [
            'id',
            'plan_name',
            'plan_price',
            'max_disk_mb',
            'months_purchased',
            'total_price_paid',
            'purchase_date',
            'expiration_date',
            'days_remaining',
            'status',
        ]


  # ---------------------------------------------------------------------------
  # Historial de suscripciones (salida)
  # ---------------------------------------------------------------------------

class UserPlanHistoryOutputSerializer(serializers.ModelSerializer):
    plan_name  = serializers.CharField(source='plan.name')
    plan_price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2)

    class Meta:
        model  = UserPlan
        fields = [
            'id',
            'plan_name',
            'plan_price',
            'months_purchased',
            'total_price_paid',
            'purchase_date',
            'expiration_date',
            'status',
            'created_at',
        ]


  # ---------------------------------------------------------------------------
  # Admin – listado de todas las suscripciones (salida)
  # ---------------------------------------------------------------------------

class AdminUserPlanOutputSerializer(serializers.ModelSerializer):
    plan_name  = serializers.CharField(source='plan.name')
    user_email = serializers.EmailField(source='user.email')
    user_name  = serializers.SerializerMethodField()

    class Meta:
        model  = UserPlan
        fields = [
            'id',
            'user_email',
            'user_name',
            'plan_name',
            'months_purchased',
            'total_price_paid',
            'purchase_date',
            'expiration_date',
            'status',
            'created_at',
        ]

    def get_user_name(self, obj):
        return obj.user.full_name