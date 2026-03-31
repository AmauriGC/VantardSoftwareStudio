# kernel/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):

    response = exception_handler(exc, context)

    if response is not None:

        detail = response.data.get('detail', None)

        if detail is not None:
            message = str(detail)
        else:

            message = 'Error de validacion'

        response.data = {
            'message': message,
            'data':    response.data,
            'error':   True,
            'status':  response.status_code,
        }
        return response

    return Response(
        {
            'message': 'Error interno del servidor',
            'data':    None,
            'error':   True,
            'status':  status.HTTP_500_INTERNAL_SERVER_ERROR,
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
