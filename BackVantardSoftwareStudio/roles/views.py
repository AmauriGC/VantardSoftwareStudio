from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsAdminUser
from system_logs.utils import log_request
from kernel.responses import success_response, error_response
ROL_NOT_FOUND = 'Rol no encontrado.'

from .models import Role
from .serializers import RoleOutputSerializer, RoleInputSerializer


  # ---------------------------------------------------------------------------
  # Listar y crear roles
  # ---------------------------------------------------------------------------

class RoleListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        roles = Role.objects.all()
        log_request(request, 'ADMIN_LIST_ROLES', 200)
        return success_response(
            data=RoleOutputSerializer(roles, many=True).data,
            message='Roles obtenidos correctamente.',
        )

    def post(self, request):
        serializer = RoleInputSerializer(data=request.data)
        if not serializer.is_valid():
            log_request(request, 'ADMIN_CREATE_ROLE_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        role = Role.objects.create(role_name=serializer.validated_data['role_name'])
        log_request(request, 'ADMIN_CREATE_ROLE', 201)
        return success_response(
            data=RoleOutputSerializer(role).data,
            message='Rol creado correctamente.',
            status=201,
        )


  # ---------------------------------------------------------------------------
  # Detalle, actualizar y eliminar un rol
  # ---------------------------------------------------------------------------

class RoleDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def _get_role(self, pk):
        try:
            return Role.objects.get(pk=pk)
        except Role.DoesNotExist:
            return None

    def get(self, request, pk):
        role = self._get_role(pk)
        if not role:
            return error_response(message=ROL_NOT_FOUND, status=404)

        log_request(request, 'ADMIN_GET_ROLE', 200)
        return success_response(
            data=RoleOutputSerializer(role).data,
            message='Rol obtenido correctamente.',
        )

    def put(self, request, pk):
        role = self._get_role(pk)
        if not role:
            return error_response(message=ROL_NOT_FOUND, status=404)

        serializer = RoleInputSerializer(
            data=request.data,
            context={'instance': role},
        )
        if not serializer.is_valid():
            log_request(request, 'ADMIN_UPDATE_ROLE_FAILED', 400)
            return error_response(
                message='Datos inválidos.',
                data=serializer.errors,
                status=400,
            )

        role.role_name = serializer.validated_data['role_name']
        role.save(update_fields=['role_name'])

        log_request(request, 'ADMIN_UPDATE_ROLE', 200)
        return success_response(
            data=RoleOutputSerializer(role).data,
            message='Rol actualizado correctamente.',
        )

    def delete(self, request, pk):
        role = self._get_role(pk)
        if not role:
            return error_response(message=ROL_NOT_FOUND, status=404)

          # Bloquear si hay usuarios con este rol asignado
        if role.users.filter(deleted_at__isnull=True).exists():
            return error_response(
                message='No se puede eliminar un rol que tiene usuarios asignados.',
                status=400,
            )

        role.delete()
        log_request(request, 'ADMIN_DELETE_ROLE', 200)
        return success_response(message='Rol eliminado correctamente.')
    
    