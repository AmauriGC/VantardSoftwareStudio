from rest_framework import serializers
from .models import Plan


# ---------------------------------------------------------------------------
# Lectura (público y admin)
# ---------------------------------------------------------------------------

class PlanOutputSerializer(serializers.ModelSerializer):

    max_disk_gb = serializers.FloatField(read_only=True)
    is_free     = serializers.BooleanField(read_only=True)
    max_upload_mb = serializers.SerializerMethodField()

    class Meta:
        model  = Plan
        fields = [
            'id',
            'name',
            'price',
            'max_disk_mb',
            'max_upload_mb',
            'max_disk_gb',
            'is_free',
            'status',
            'created_at',
            'updated_at',
        ]

    def get_max_upload_mb(self, obj):
        explicit = getattr(obj, 'max_upload_mb', None)
        if explicit is not None:
            return explicit

        by_name = {
            'gratis': 5,
            'free': 5,
            'basico': 5,
            'básico': 5,
            'medio': 10,
            'pro': 10,
            'premium': 20,
            'completo': 20,
        }
        plan_name = str(getattr(obj, 'name', '')).strip().lower()
        if plan_name in by_name:
            return by_name[plan_name]

        return min(getattr(obj, 'max_disk_mb', 10), 10)


# ---------------------------------------------------------------------------
# Crear plan (admin)
# ---------------------------------------------------------------------------

class PlanCreateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=50)
    price       = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    max_disk_mb = serializers.IntegerField(min_value=1)
    status      = serializers.ChoiceField(
        choices=Plan.Status.choices,
        default=Plan.Status.ACTIVE,
        required=False,
    )

    def validate_name(self, value):
        if Plan.objects.filter(name__iexact=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('Ya existe un plan con ese nombre.')
        return value


# ---------------------------------------------------------------------------
# Actualizar plan (admin)
# ---------------------------------------------------------------------------

class PlanUpdateSerializer(serializers.Serializer):
    name        = serializers.CharField(max_length=50, required=False)
    price       = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0, required=False)
    max_disk_mb = serializers.IntegerField(min_value=1, required=False)
    status      = serializers.ChoiceField(choices=Plan.Status.choices, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Debes enviar al menos un campo para actualizar.')
        return attrs

    def validate_name(self, value):
        # Excluimos la instancia actual si ya existe con ese nombre
        instance_id = self.context.get('instance_id')
        qs = Plan.objects.filter(name__iexact=value, deleted_at__isnull=True)
        if instance_id:
            qs = qs.exclude(pk=instance_id)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un plan con ese nombre.')
        return value
    