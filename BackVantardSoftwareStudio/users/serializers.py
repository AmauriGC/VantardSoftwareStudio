from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
import re
from .models import User
from user_plans.models import UserPlan
from deployments.models import Deployment


NAME_PATTERN = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿÑñ\s'-]+$")


def _validate_person_name(value, field_label):
    normalized = str(value or '').strip()
    if not normalized:
        raise serializers.ValidationError(f'{field_label} es obligatorio.')
    if not NAME_PATTERN.match(normalized):
        raise serializers.ValidationError(
            f'{field_label} solo permite letras, espacios, apostrofe y guion.'
        )
    return normalized


def _validate_strong_password(value):
    pwd = str(value or '').strip()
    errors = []

    if len(pwd) < 8:
        errors.append('Debe tener al menos 8 caracteres.')
    if not re.search(r'[A-Z]', pwd):
        errors.append('Debe incluir al menos una mayúscula.')
    if not re.search(r'[a-z]', pwd):
        errors.append('Debe incluir al menos una minúscula.')
    if not re.search(r'\d', pwd):
        errors.append('Debe incluir al menos un número.')
    if not re.search(r'[^A-Za-z0-9]', pwd):
        errors.append('Debe incluir al menos un carácter especial.')

    if errors:
        raise serializers.ValidationError(errors)

    validate_password(pwd)
    return pwd


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

    def validate_first_name(self, value):
        return _validate_person_name(value, 'El nombre')

    def validate_last_name(self, value):
        return _validate_person_name(value, 'El apellido')

    def validate_password(self, value):
        return _validate_strong_password(value)


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
    plan_id = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    plan_status = serializers.SerializerMethodField()
    plan_max_disk_mb = serializers.SerializerMethodField()
    plan_max_upload_mb = serializers.SerializerMethodField()
    used_disk_mb = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id',
            'first_name',
            'last_name',
            'email',
            'status',
            'role_name',
            'plan_id',
            'plan_name',
            'plan_status',
            'plan_max_disk_mb',
            'plan_max_upload_mb',
            'used_disk_mb',
            'created_at',
            'updated_at',
        ]

    def get_role_name(self, obj):
        return obj.role.role_name if obj.role else None

    def _get_active_user_plan(self, obj):
        return (
            UserPlan.objects.filter(
                user=obj,
                status=UserPlan.Status.ACTIVE,
                deleted_at__isnull=True,
            )
            .select_related('plan')
            .first()
        )

    def _resolve_max_upload_mb(self, plan):
        explicit = getattr(plan, 'max_upload_mb', None)
        if explicit is not None:
            return explicit

        # Fallback por nombre mientras el esquema no tenga max_upload_mb.
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
        plan_name = str(getattr(plan, 'name', '')).strip().lower()
        if plan_name in by_name:
            return by_name[plan_name]

        return min(getattr(plan, 'max_disk_mb', 10), 10)

    def get_plan_id(self, obj):
        user_plan = self._get_active_user_plan(obj)
        return user_plan.plan_id if user_plan else None

    def get_plan_name(self, obj):
        user_plan = self._get_active_user_plan(obj)
        return user_plan.plan.name if user_plan and user_plan.plan else None

    def get_plan_status(self, obj):
        user_plan = self._get_active_user_plan(obj)
        return user_plan.status if user_plan else None

    def get_plan_max_disk_mb(self, obj):
        user_plan = self._get_active_user_plan(obj)
        return user_plan.plan.max_disk_mb if user_plan and user_plan.plan else 0

    def get_plan_max_upload_mb(self, obj):
        user_plan = self._get_active_user_plan(obj)
        if not user_plan or not user_plan.plan:
            return 0
        return self._resolve_max_upload_mb(user_plan.plan)

    def get_used_disk_mb(self, obj):
        value = (
            Deployment.objects.filter(user=obj, deleted_at__isnull=True)
            .values_list('disk_used_mb', flat=True)
        )
        return int(sum(value or [0]))


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

    def validate_first_name(self, value):
        return _validate_person_name(value, 'El nombre')

    def validate_last_name(self, value):
        return _validate_person_name(value, 'El apellido')


# ---------------------------------------------------------------------------
# Cambiar contraseña
# ---------------------------------------------------------------------------

class UserChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return _validate_strong_password(value)

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


# ---------------------------------------------------------------------------
# Restablecer contraseña por correo
# ---------------------------------------------------------------------------

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        return _validate_strong_password(value)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError('Las contraseñas no coinciden.')
        return attrs
    