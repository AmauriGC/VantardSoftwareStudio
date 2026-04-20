from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):

    message = 'Acceso denegado'

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            # Consideramos admin tanto por rol de negocio (is_admin)
            # como por bandera de staff de Django (is_staff),
            # para ser compatibles con usuarios antiguos y superusuarios.
            and (getattr(user, "is_admin", False) or getattr(user, "is_staff", False))
        )
