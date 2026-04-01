from rest_framework.permissions import BasePermission

class IsAdminUser(BasePermission):

    message = 'No tienes permiso para acceder a los logs del sistema.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )