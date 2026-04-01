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


class IsOwnerOrAdmin(BasePermission):
    """Permite acceso al propio usuario o a un Admin."""

    message = 'No tienes permiso para acceder a este recurso.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return obj == request.user or request.user.is_admin