# kernel/responses.py
from rest_framework.response import Response

def success_response(data=None, message='Operacion exitosa', status=200):

    return Response(
        {
            'message': message,
            'data':    data,
            'error':   False,
            'status':  status,
        },
        status=status
    )

def error_response(message='Error', status=400, data=None):

    return Response(
        {
            'message': message,
            'data':    data,
            'error':   True,
            'status':  status,
        },
        status=status
    )
