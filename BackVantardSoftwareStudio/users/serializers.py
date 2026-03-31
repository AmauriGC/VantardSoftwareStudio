from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


# ---------------------------------------------------------------------------
# Registro
# ---------------------------------------------------------------------------

class UserRegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name  = serializers.CharField(max_length=100)
    email      = serializers.EmailField(max_length=150)
    password   = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class UserLoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------

class TokenRefreshInputSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class UserLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ---------------------------------------------------------------------------
# Perfil (lectura)
# ---------------------------------------------------------------------------

class UserProfileOutputSerializer(serializers.ModelSerializer):

    role_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'status',
            'role_name',
            'created_at',
            'updated_at',
        ]

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else None


# ---------------------------------------------------------------------------
# Actualizar perfil
# ---------------------------------------------------------------------------

class UserUpdateProfileSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, required=False)
    last_name  = serializers.CharField(max_length=100, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Debes enviar al menos un campo para actualizar.')
        return attrs


# ---------------------------------------------------------------------------
# Cambiar contraseña
# ---------------------------------------------------------------------------

class UserChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError('Las contraseñas nuevas no coinciden.')
        return attrs


# ---------------------------------------------------------------------------
# Admin – listado de usuarios
# ---------------------------------------------------------------------------

class UserListOutputSerializer(serializers.ModelSerializer):

    role_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'status',
            'role_name',
            'created_at',
        ]

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else None


# ---------------------------------------------------------------------------
# Admin – cambiar status de usuario
# ---------------------------------------------------------------------------

class UserUpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=User.Status.choices)
    