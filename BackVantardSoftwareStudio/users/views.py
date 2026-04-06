from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.db import transaction
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import EmailMultiAlternatives
from datetime import timedelta
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import User
from .serializers import (
    UserRegisterSerializer,
    UserLoginSerializer,
    UserLogoutSerializer,
    TokenRefreshInputSerializer,
    UserProfileOutputSerializer,
    UserUpdateProfileSerializer,
    UserChangePasswordSerializer,
    UserListOutputSerializer,
    UserUpdateStatusSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .permissions import IsAdminUser
from roles.models import Role
from plans.models import Plan
from user_plans.models import UserPlan
from system_logs.utils import log_request
from kernel.responses import success_response, error_response

INVALID_DATA_MSG = 'Datos inválidos.'


# ---------------------------------------------------------------------------
# Registro
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'USER_REGISTER_FAILED', 400)
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        free_plan = Plan.objects.filter(
            status=Plan.Status.ACTIVE,
            deleted_at__isnull=True,
            price=0,
        ).order_by('id').first()

        if not free_plan:
            log_request(request, 'USER_REGISTER_FAILED', 500)
            return error_response(
                message='No hay un plan Gratis activo configurado. Contacta al administrador.',
                status=500,
            )

        default_role = Role.objects.filter(role_name__iexact='user').first()
        if not default_role:
            log_request(request, 'USER_REGISTER_FAILED', 500)
            return error_response(
                message='No existe el rol User configurado. Contacta al administrador.',
                status=500,
            )

        data = serializer.validated_data
        now = timezone.now()

        with transaction.atomic():
            user = User.objects.create_user(
                email=data['email'],
                password=data['password'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=default_role,
            )

            UserPlan.objects.create(
                user=user,
                plan=free_plan,
                purchase_date=now,
                expiration_date=now + timedelta(days=30),
                months_purchased=1,
                total_price_paid=free_plan.price,
                status=UserPlan.Status.ACTIVE,
            )

        refresh = RefreshToken.for_user(user)
        log_request(request, 'USER_REGISTER', 201, user_id=user.pk)

        return success_response(
            data={
                'access_token':  str(refresh.access_token),
                'refresh_token': str(refresh),
                'user':          UserProfileOutputSerializer(user).data,
            },
            message='Cuenta creada correctamente.',
            status=201,
        )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth_login'

    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'USER_LOGIN_FAILED', 400)
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        data = serializer.validated_data
        user = authenticate(
            request,
            username=data['email'].lower(),
            password=data['password'],
        )

        if user is None:
            log_request(request, 'USER_LOGIN_FAILED', 401)
            return error_response(
                message='Credenciales incorrectas.',
                status=401,
            )

        if not user.is_active or user.status == User.Status.BLOCKED:
            log_request(request, 'USER_LOGIN_BLOCKED', 403, user_id=user.pk)
            return error_response(
                message='Tu cuenta está suspendida o bloqueada.',
                status=403,
            )

        refresh = RefreshToken.for_user(user)
        log_request(request, 'USER_LOGIN', 200, user_id=user.pk)

        return success_response(
            data={
                'access_token':  str(refresh.access_token),
                'refresh_token': str(refresh),
                'user':          UserProfileOutputSerializer(user).data,
            },
            message='Inicio de sesión exitoso.',
        )


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------

class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshInputSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        try:
            old_refresh   = RefreshToken(serializer.validated_data['refresh'])
            access_token  = str(old_refresh.access_token)
            # ROTATE_REFRESH_TOKENS=True genera uno nuevo y blacklistea el anterior
            new_refresh   = str(old_refresh)
        except TokenError:
            return error_response(
                message='Token inválido o expirado.',
                status=401,
            )

        return success_response(
            data={
                'access_token':  access_token,
                'refresh_token': new_refresh,
            },
            message='Token renovado correctamente.',
        )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UserLogoutSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        try:
            token = RefreshToken(serializer.validated_data['refresh'])
            token.blacklist()
        except TokenError:
            return error_response(
                message='Token inválido o ya expirado.',
                status=400,
            )

        log_request(request, 'USER_LOGOUT', 200)
        return success_response(message='Sesión cerrada correctamente.')


# ---------------------------------------------------------------------------
# Perfil del usuario autenticado
# ---------------------------------------------------------------------------

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileOutputSerializer(request.user)
        log_request(request, 'USER_GET_PROFILE', 200)
        return success_response(
            data=serializer.data,
            message='Perfil obtenido correctamente.',
        )

    def put(self, request):
        serializer = UserUpdateProfileSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'USER_UPDATE_PROFILE_FAILED', 400)
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        user = request.user
        for field, value in serializer.validated_data.items():
            setattr(user, field, value)
        user.save(update_fields=[*serializer.validated_data.keys(), 'updated_at'])

        log_request(request, 'USER_UPDATE_PROFILE', 200)
        return success_response(
            data=UserProfileOutputSerializer(user).data,
            message='Perfil actualizado correctamente.',
        )


# ---------------------------------------------------------------------------
# Cambiar contraseña
# ---------------------------------------------------------------------------

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UserChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'USER_CHANGE_PASSWORD_FAILED', 400)
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        data = serializer.validated_data
        user = request.user

        if not user.check_password(data['current_password']):
            log_request(request, 'USER_CHANGE_PASSWORD_FAILED', 400)
            return error_response(
                message='La contraseña actual es incorrecta.',
                status=400,
            )

        user.set_password(data['new_password'])
        user.save(update_fields=['password', 'updated_at'])

        log_request(request, 'USER_CHANGE_PASSWORD', 200)
        return success_response(message='Contraseña actualizada correctamente.')


# ---------------------------------------------------------------------------
# Recuperación de contraseña
# ---------------------------------------------------------------------------

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_request'

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        email = serializer.validated_data['email'].strip().lower()
        user = User.objects.filter(
            email__iexact=email,
            deleted_at__isnull=True,
            is_active=True,
        ).select_related('role').first()

        # Respuesta genérica para evitar enumeración de correos.
        generic_message = (
            'Si el correo existe y es elegible, se enviará un enlace para restablecer la contraseña.'
        )

        if user and (not user.role or str(user.role.role_name).strip().lower() != 'admin'):
            # La validación de credenciales solo aplica al backend SMTP real.
            # console.EmailBackend no necesita EMAIL_HOST_USER/PASSWORD.
            uses_smtp = 'smtp' in settings.EMAIL_BACKEND.lower()
            if uses_smtp and (not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD):
                log_request(request, 'PASSWORD_RESET_REQUEST_SMTP_MISSING_CONFIG', 500, user_id=user.pk)
                return success_response(message=generic_message)

            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/auth/restablecer?uid={uid}&token={token}"

            plain_text = (
                f'Hola {user.first_name},\n\n'
                'Recibimos una solicitud para restablecer la contraseña de tu cuenta en Vantard Software Studio.\n\n'
                f'Restablece tu contraseña aquí:\n{reset_url}\n\n'
                'Este enlace expira en 1 hora.\n\n'
                '⚠ Si no fuiste tú quien solicitó este cambio, ignora este correo. '
                'Tu contraseña actual sigue siendo la misma y nadie más puede acceder a tu cuenta. '
                'No compartas este enlace con nadie.\n\n'
                '— El equipo de Vantard Software Studio'
            )

            html_content = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background-color:#1d4ed8;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
              Vantard Software Studio
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">
              Hola, {user.first_name} 👋
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
              Haz clic en el botón de abajo para crear una nueva contraseña.
            </p>

            <!-- Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background-color:#1d4ed8;border-radius:6px;">
                  <a href="{reset_url}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">
                    Restablecer contraseña
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:
            </p>
            <p style="margin:0 0 28px;font-size:12px;color:#2563eb;word-break:break-all;">
              <a href="{reset_url}" style="color:#2563eb;">{reset_url}</a>
            </p>

            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
              ⏱ Este enlace expira en <strong>1 hora</strong>.
            </p>
          </td>
        </tr>

        <!-- Warning -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef9c3;border:1px solid #fde047;border-radius:6px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#854d0e;">
                    ⚠ ¿No fuiste tú?
                  </p>
                  <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                    Si no solicitaste restablecer tu contraseña, ignora este correo. Tu contraseña actual
                    no cambiará y nadie más puede acceder a tu cuenta.<br>
                    <strong>No compartas este enlace con nadie.</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Este correo fue enviado automáticamente por Vantard Software Studio. Por favor no respondas a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

            try:
                email_msg = EmailMultiAlternatives(
                    subject='Recuperación de contraseña - VSS',
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email],
                )
                email_msg.attach_alternative(html_content, 'text/html')
                email_msg.send(fail_silently=False)
            except Exception:
                log_request(request, 'PASSWORD_RESET_REQUEST_EMAIL_FAILED', 500, user_id=user.pk)
                return success_response(message=generic_message)

            log_request(request, 'PASSWORD_RESET_REQUEST', 200, user_id=user.pk)
        else:
            log_request(request, 'PASSWORD_RESET_REQUEST_IGNORED', 200)

        return success_response(message=generic_message)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_confirm'

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        data = serializer.validated_data

        try:
            user_id = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.filter(
                pk=user_id,
                deleted_at__isnull=True,
                is_active=True,
            ).select_related('role').first()
        except Exception:
            user = None

        if (
            not user
            or (user.role and str(user.role.role_name).strip().lower() == 'admin')
            or not default_token_generator.check_token(user, data['token'])
        ):
            return error_response(
                message='El enlace es inválido o ya expiró.',
                status=400,
            )

        user.set_password(data['new_password'])
        user.save(update_fields=['password', 'updated_at'])
        log_request(request, 'PASSWORD_RESET_CONFIRM', 200, user_id=user.pk)

        return success_response(message='Contraseña restablecida correctamente.')

# ---------------------------------------------------------------------------
# Eliminar cuenta (soft delete)
# ---------------------------------------------------------------------------

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.soft_delete()
        log_request(request, 'USER_DELETE_ACCOUNT', 200)
        return success_response(message='Cuenta eliminada correctamente.')


# ---------------------------------------------------------------------------
# Admin – Listado de usuarios
# ---------------------------------------------------------------------------

class UserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = User.objects.filter(deleted_at__isnull=True)

        status_filter = request.query_params.get('status')
        search        = request.query_params.get('search')

        if status_filter:
            valid_statuses = [s.value for s in User.Status]
            if status_filter not in valid_statuses:
                return error_response(
                    message=f'Status inválido. Valores permitidos: {", ".join(valid_statuses)}.',
                    status=400,
                )
            qs = qs.filter(status=status_filter)

        if search:
            qs = qs.filter(
                email__icontains=search
            ) | qs.filter(
                first_name__icontains=search
            ) | qs.filter(
                last_name__icontains=search
            )

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)

        serializer = UserListOutputSerializer(page, many=True)
        log_request(request, 'ADMIN_LIST_USERS', 200)
        return success_response(
            data={
                'total':    paginator.page.paginator.count,
                'pagina':   paginator.page.number,
                'paginas':  paginator.page.paginator.num_pages,
                'users':    serializer.data,
            },
            message='Usuarios obtenidos correctamente.',
        )


# ---------------------------------------------------------------------------
# Admin – Cambiar status de un usuario
# ---------------------------------------------------------------------------

class UserUpdateStatusView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, deleted_at__isnull=True)
        except User.DoesNotExist:
            return error_response(
                message=f'No se encontró un usuario con id {pk}.',
                status=404,
            )

        if user == request.user:
            return error_response(
                message='No puedes cambiar tu propio status.',
                status=400,
            )

        serializer = UserUpdateStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message=INVALID_DATA_MSG,
                data=serializer.errors,
                status=400,
            )

        user.status    = serializer.validated_data['status']
        user.is_active = user.status == User.Status.ACTIVE
        user.save(update_fields=['status', 'is_active', 'updated_at'])

        log_request(request, 'ADMIN_UPDATE_USER_STATUS', 200)
        return success_response(
            data=UserProfileOutputSerializer(user).data,
            message=f'Status del usuario actualizado a "{user.status}".',
        )
    