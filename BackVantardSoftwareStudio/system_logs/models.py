from django.db import models
from django.conf import settings

class SystemLog(models.Model):

    class HttpMethod(models.TextChoices):
        GET     = 'GET',    'GET'
        POST    = 'POST',   'POST'
        PUT     = 'PUT',    'PUT'
        PATCH   = 'PATCH',  'PATCH'
        DELETE  = 'DELETE', 'DELETE'
        OPTIONS = 'OPTIONS','OPTIONS'
        HEAD    = 'HEAD',   'HEAD'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='user_id',
        related_name='system_logs',
        help_text='Usuario que realizó la petición (FK; se permite null).'
    )
    ip_address = models.CharField(
        max_length=45,
        db_column='ip_address',
        help_text='IPv4 (max 15 chars) o IPv6 (max 45 chars).'
    )
    request_path = models.CharField(
        max_length=500,
        db_column='request_path',
        help_text='Ruta completa de la petición, ej: /api/v1/deployments/'
    )
    action = models.CharField(
        max_length=100,
        db_column='action',
        help_text='Descripción de la acción realizada, ej: USER_LOGIN, SITE_UPLOAD.'
    )
    http_method = models.CharField(
        max_length=10,
        choices=HttpMethod.choices,
        db_column='http_method',
    )
    status_code = models.IntegerField(
        db_column='status_code',
        help_text='Código HTTP de respuesta, ej: 200, 201, 400, 404, 500.'
    )
    user_agent = models.CharField(
        max_length=255,
        blank=True,
        default='',
        db_column='user_agent',
        help_text='User-Agent del cliente que realizó la petición.'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_column='created_at'
    )

    class Meta:
        db_table = 'system_logs'          
        ordering = ['-created_at']        
        verbose_name = 'System Log'
        verbose_name_plural = 'System Logs'
        indexes = [
            models.Index(fields=['ip_address'],  name='idx_system_logs_ip'),
            models.Index(fields=['action'],      name='idx_system_logs_action'),
            models.Index(fields=['status_code'], name='idx_system_logs_status_code'),
            models.Index(fields=['created_at'],  name='idx_system_logs_created_at'),
        ]

    def __str__(self):
        return (
            f"[{self.created_at:%Y-%m-%d %H:%M:%S}] "
            f"{self.http_method} {self.request_path} → {self.status_code}"
        )

    @property
    def is_success(self) -> bool:
        return 200 <= self.status_code < 300

    @property
    def is_error(self) -> bool:
        return self.status_code >= 400
    