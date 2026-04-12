from rest_framework import serializers
from .models import Deployment
from .utils import is_valid_domain

# ---------------------------------------------------------------------------
# Crear deployment (entrada)
# ---------------------------------------------------------------------------

class DeploymentCreateSerializer(serializers.Serializer):
    domain = serializers.CharField(max_length=100)

    def validate_domain(self, value):
        value = value.strip().lower()

        if not is_valid_domain(value):
            raise serializers.ValidationError(
                'El dominio solo puede contener letras minúsculas, números y guiones. '
                'No puede empezar ni terminar con guión.'
            )

        # Regla de negocio:
        # - Un dominio puede tener muchas versiones para el MISMO usuario.
        # - El dominio NO puede ser usado por otro usuario.
        user = self.context.get('user')
        qs = Deployment.objects.filter(domain=value, deleted_at__isnull=True)

        if user is not None:
            # Si existe el dominio para otro usuario distinto, no está disponible.
            if qs.exclude(user=user).exists():
                raise serializers.ValidationError('Este dominio no está disponible.')
        else:
            # Fallback conservador si no se pasó el usuario en el contexto.
            if qs.exists():
                raise serializers.ValidationError('Este dominio no está disponible.')

        return value

# ---------------------------------------------------------------------------
# Actualizar deployment (entrada)
# ---------------------------------------------------------------------------

class DeploymentUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Deployment.Status.choices, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Debes enviar al menos un campo para actualizar.')
        return attrs

# ---------------------------------------------------------------------------
# Salida del usuario
# ---------------------------------------------------------------------------

class DeploymentOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Deployment
        fields = [
            'id',
            'domain',
            'site_url',
            'disk_used_mb',
            'traffic_visit_count',
            'status',
            'created_at',
            'updated_at',
        ]

# ---------------------------------------------------------------------------
# Admin – salida con datos del usuario
# ---------------------------------------------------------------------------

class AdminDeploymentOutputSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email')
    user_name  = serializers.SerializerMethodField()

    class Meta:
        model  = Deployment
        fields = [
            'id',
            'user_email',
            'user_name',
            'domain',
            'site_url',
            'disk_used_mb',
            'traffic_visit_count',
            'status',
            'created_at',
            'updated_at',
        ]

    def get_user_name(self, obj):
        return obj.user.full_name
    

