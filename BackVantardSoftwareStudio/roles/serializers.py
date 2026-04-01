from rest_framework import serializers
from .models import Role


  # ---------------------------------------------------------------------------
  # Salida
  # ---------------------------------------------------------------------------

class RoleOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Role
        fields = ['id', 'role_name', 'created_at']


  # ---------------------------------------------------------------------------
  # Crear / Actualizar (entrada)
  # ---------------------------------------------------------------------------

class RoleInputSerializer(serializers.Serializer):
    role_name = serializers.CharField(max_length=50)

    def validate_role_name(self, value):
        value = value.strip()
        qs = Role.objects.filter(role_name__iexact=value)
        # En actualización excluir el propio registro
        if self.context.get('instance'):
            qs = qs.exclude(pk=self.context['instance'].pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un rol con ese nombre.')
        return value
    
    