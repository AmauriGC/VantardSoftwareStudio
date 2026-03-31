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

        if Deployment.objects.filter(domain=value, deleted_at__isnull=True).exists():
            raise serializers.ValidationError('Este dominio ya está en uso.')

        return value


  # ---------------------------------------------------------------------------
  # Actualizar deployment (entrada)
  # ---------------------------------------------------------------------------

class DeploymentUpdateSerializer(serializers.Serializer):
    domain = serializers.CharField(max_length=100, required=False)
    status = serializers.ChoiceField(choices=Deployment.Status.choices, required=False)

    def validate_domain(self, value):
        value = value.strip().lower()

        if not is_valid_domain(value):
            raise serializers.ValidationError(
                'El dominio solo puede contener letras minúsculas, números y guiones.'
            )

        qs = Deployment.objects.filter(domain=value, deleted_at__isnull=True)
        if self.context.get('instance'):
            qs = qs.exclude(pk=self.context['instance'].pk)
        if qs.exists():
            raise serializers.ValidationError('Este dominio ya está en uso.')

        return value

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
    
    