from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """Permite acceso solo a usuarios con rol Admin."""

    message = 'No tienes permiso para realizar esta acción.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )