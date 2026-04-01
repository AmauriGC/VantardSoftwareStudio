from .models import SystemLog

def log_request(request, action: str, status_code: int, user_id: int = None) -> SystemLog:

    uid = user_id
    if uid is None and request.user and request.user.is_authenticated:
        uid = request.user.pk

    return SystemLog.objects.create(
        user_id=uid,
        ip_address=_get_client_ip(request),
        request_path=request.path,
        action=action,
        http_method=request.method,
        status_code=status_code,
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
    )

def _get_client_ip(request) -> str:
    """Obtiene la IP real del cliente considerando proxies/load balancers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')

