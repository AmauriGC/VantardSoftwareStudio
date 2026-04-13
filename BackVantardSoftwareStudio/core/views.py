from django.shortcuts import render

from django.db.utils import OperationalError, ProgrammingError

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from kernel.responses import error_response, success_response
from users.permissions import IsAdminUser

from .models import (
    AdminDashboardStats,
    AdminDeploymentStateCount,
    AdminPlanDistribution,
    UserDashboardProfile,
)


def home(request):
    return render(request, 'core/Home.html')


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            stats = AdminDashboardStats.objects.first()
        except (ProgrammingError, OperationalError) as exc:
            return error_response(
                message=(
                    'No se encontraron las SQL views del dashboard en la base de datos. '
                    'Ejecuta el script BaseDeDatos/004_dashboard_views.sql en tu MySQL y reintenta. '
                    f'Detalle: {exc}'
                ),
                status=500,
            )

        if not stats:
            return error_response(
                message='No se encontró la vista vw_admin_dashboard_stats. Verifica que exista en la base de datos.',
                status=500,
            )

        try:
            plan_rows = list(
                AdminPlanDistribution.objects.all().order_by('plan_name').values('plan_name', 'user_count')
            )
            state_rows = list(
                AdminDeploymentStateCount.objects.all().values('estado', 'cantidad')
            )
        except (ProgrammingError, OperationalError) as exc:
            return error_response(
                message=(
                    'No se pudieron consultar las SQL views del dashboard. '
                    'Ejecuta el script BaseDeDatos/004_dashboard_views.sql en tu MySQL y reintenta. '
                    f'Detalle: {exc}'
                ),
                status=500,
            )

        distribucion_planes = [
            {
                'nombre': row['plan_name'],
                'cantidad': row['user_count'],
            }
            for row in plan_rows
        ]
        status_data = [
            {
                'estado': row['estado'],
                'cantidad': row['cantidad'],
            }
            for row in state_rows
        ]

        return success_response(
            data={
                'totalUsuarios': int(stats.total_users or 0),
                'usuariosActivos': int(stats.active_users or 0),
                'totalDespliegues': int(stats.total_deployments or 0),
                'desplieguesActivos': int(stats.active_deployments or 0),
                'almacenamientoUsadoMB': int(stats.total_disk_used_mb or 0),
                'traficoTotal': int(stats.total_traffic_visit_count or 0),
                'distribucionPlanes': distribucion_planes,
                'statusData': status_data,
            },
            message='Dashboard admin obtenido correctamente.',
        )


class UserDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            row = UserDashboardProfile.objects.filter(user_id=getattr(request.user, 'pk', None)).first()
        except (ProgrammingError, OperationalError) as exc:
            return error_response(
                message=(
                    'No se encontraron las SQL views del dashboard de usuario en la base de datos. '
                    'Ejecuta el script BaseDeDatos/004_dashboard_views.sql en tu MySQL y reintenta. '
                    f'Detalle: {exc}'
                ),
                status=500,
            )

        if not row:
            return error_response(
                message='No se encontró la vista vw_user_dashboard_profile para este usuario. Verifica que exista en la base de datos.',
                status=500,
            )

        return success_response(
            data={
                'user_id': row.user_id,
                'first_name': row.first_name,
                'last_name': row.last_name,
                'email': row.email,
                'plan_name': row.plan_name,
                'plan_max_disk_mb': int(row.plan_max_disk_mb or 0),
                'used_disk_mb': int(row.used_disk_mb or 0),
                'total_traffic_visit_count': int(row.total_traffic_visit_count or 0),
                'active_site_domain': row.active_site_domain,
                'active_site_disk_used_mb': int(row.active_site_disk_used_mb or 0),
            },
            message='Dashboard de usuario obtenido correctamente.',
        )