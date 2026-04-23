from datetime import datetime, timezone

from django.http import HttpResponse
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import SystemLog
from .serializers import SystemLogOutputSerializer
from .permissions import IsAdminUser
from kernel.responses import success_response, error_response


def _apply_log_filters(qs, params):
    action      = params.get('action')
    http_method = params.get('http_method')
    status_code = params.get('status_code')
    user_id     = params.get('user_id')
    fecha_desde = params.get('fecha_desde')
    fecha_hasta = params.get('fecha_hasta')

    if action:
        qs = qs.filter(action__icontains=action)
    if http_method:
        qs = qs.filter(http_method=http_method.upper())
    if status_code and status_code.isdigit():
        qs = qs.filter(status_code=int(status_code))
    if user_id and user_id.isdigit():
        qs = qs.filter(user_id=int(user_id))
    if fecha_desde:
        qs = qs.filter(created_at__date__gte=fecha_desde)
    if fecha_hasta:
        qs = qs.filter(created_at__date__lte=fecha_hasta)

    return qs


class SystemLogListView(APIView):

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        status_code = request.query_params.get('status_code')
        user_id     = request.query_params.get('user_id')

        if status_code and not status_code.isdigit():
            return error_response(message='El status_code debe ser un numero entero.', status=400)
        if user_id and not user_id.isdigit():
            return error_response(message='El user_id debe ser un numero entero.', status=400)

        qs = _apply_log_filters(SystemLog.objects.all(), request.query_params)

        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(qs, request)

        serializer = SystemLogOutputSerializer(page, many=True)
        return success_response(
            data={
                'total':   paginator.page.paginator.count,
                'pagina':  paginator.page.number,
                'paginas': paginator.page.paginator.num_pages,
                'logs':    serializer.data,
            },
            message='Logs obtenidos correctamente.',
        )


class SystemLogDetailView(APIView):

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk):
        try:
            log = SystemLog.objects.get(pk=pk)
        except SystemLog.DoesNotExist:
            return error_response(message=f'No se encontro un log con id {pk}.', status=404)

        serializer = SystemLogOutputSerializer(log)
        return success_response(data=serializer.data, message='Log obtenido correctamente.')


class SystemLogDownloadView(APIView):

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = _apply_log_filters(SystemLog.objects.all(), request.query_params)
        logs = qs.select_related('user')

        now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        total = logs.count()

        lines = [
            'AUDITORIA DEL SISTEMA - VANTARD SOFTWARE STUDIO',
            f'Generado el: {now}',
            f'Total de registros exportados: {total}',
            '=' * 100,
            '',
            f'{"FECHA":<26} {"METODO":<8} {"CODIGO":<8} {"ACCION":<35} {"RUTA":<45} {"IP":<18} {"USER ID"}',
            '-' * 100,
        ]

        for log in logs:
            fecha     = log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else '-'
            metodo    = (log.http_method or '-')[:7]
            codigo    = str(log.status_code) if log.status_code else '-'
            accion    = (log.action or '-')[:34]
            ruta      = (log.request_path or '-')[:44]
            ip        = (log.ip_address or '-')[:17]
            user_id   = str(log.user_id) if log.user_id else 'Invitado'

            lines.append(
                f'{fecha:<26} {metodo:<8} {codigo:<8} {accion:<35} {ruta:<45} {ip:<18} {user_id}'
            )

        content = '\n'.join(lines) + '\n'

        filename = f'auditoria_{datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")}.txt'
        response = HttpResponse(content, content_type='text/plain; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
