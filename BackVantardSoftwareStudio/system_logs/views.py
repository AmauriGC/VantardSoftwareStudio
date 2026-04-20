from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import SystemLog
from .serializers import SystemLogOutputSerializer
from .permissions import IsAdminUser
from kernel.responses import success_response, error_response

class SystemLogListView(APIView):

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        qs = SystemLog.objects.all()

        action      = request.query_params.get('action')
        http_method = request.query_params.get('http_method')
        status_code = request.query_params.get('status_code')
        user_id     = request.query_params.get('user_id')
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')

        if action:
            qs = qs.filter(action__icontains=action)

        if http_method:
            qs = qs.filter(http_method=http_method.upper())

        if status_code:
            if not status_code.isdigit():
                return error_response(
                    message='El status_code debe ser un numero entero.',
                    status=400
                )
            qs = qs.filter(status_code=int(status_code))

        if user_id:
            if not user_id.isdigit():
                return error_response(
                    message='El user_id debe ser un numero entero.',
                    status=400
                )
            qs = qs.filter(user_id=int(user_id))

        if fecha_desde:
            qs = qs.filter(created_at__date__gte=fecha_desde)

        if fecha_hasta:
            qs = qs.filter(created_at__date__lte=fecha_hasta)

        # --- Paginacion manual con DRF ---
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 10
        page = paginator.paginate_queryset(qs, request)

        serializer = SystemLogOutputSerializer(page, many=True)
        return success_response(
            data={
                'total':    paginator.page.paginator.count,
                'pagina':   paginator.page.number,
                'paginas':  paginator.page.paginator.num_pages,
                'logs':     serializer.data,
            },
            message='Logs obtenidos correctamente.',
        )


class SystemLogDetailView(APIView):

    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, pk):
        try:
            log = SystemLog.objects.get(pk=pk)
        except SystemLog.DoesNotExist:
            return error_response(
                message=f'No se encontro un log con id {pk}.',
                status=404
            )

        serializer = SystemLogOutputSerializer(log)
        return success_response(
            data=serializer.data,
            message='Log obtenido correctamente.',
        )
    