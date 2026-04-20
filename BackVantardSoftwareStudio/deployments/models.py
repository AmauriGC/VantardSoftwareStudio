from django.db import models
from django.db.models import Q
from django.conf import settings


class DeploymentStatus(models.TextChoices):
    ACTIVE = 'active', 'Activo'
    BLOCKED = 'blocked', 'Bloqueado'
    INACTIVE = 'inactive', 'Inactivo'
    REPLACED = 'replaced', 'Reemplazado'
    FAILED = 'failed', 'Fallido'

class Deployment(models.Model):

    StatusChoices = DeploymentStatus

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='deployments'
    )

    domain = models.CharField(
        max_length=255,
        db_column='domain'
    )

    site_url = models.CharField(
        max_length=255,
        db_column='site_url'
    )

    # Información de la última versión desplegada
    version_number = models.IntegerField(
        default=0,
        db_column='version_number',
        help_text='Número incremental de versión para este despliegue (comienza en 0 y se incrementa en cada subida de ZIP).'
    )

    zip_filename = models.CharField(
        max_length=255,
        blank=True,
        default='',
        db_column='zip_filename',
        help_text='Nombre original del último ZIP subido.'
    )

    zip_path = models.CharField(
        max_length=500,
        blank=True,
        default='',
        db_column='zip_path',
        help_text='Ruta (relativa a MEDIA_ROOT) del último ZIP subido.'
    )

    disk_used_mb = models.IntegerField(
        default=0,
        db_column='disk_used_mb'
    )

    traffic_visit_count = models.IntegerField(
        default=0,
        db_column='traffic_visit_count'
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
        db_column='status'
    )

    created_at = models.DateTimeField(auto_now_add=True, db_column='created_at')
    updated_at = models.DateTimeField(auto_now=True, db_column='updated_at')
    deleted_at = models.DateTimeField(null=True, blank=True, db_column='deleted_at')

    class Meta:
        db_table = 'deployments'
        ordering = ['-created_at']
        verbose_name = 'Despliegue'
        verbose_name_plural = 'Despliegues'
        constraints = [
            models.CheckConstraint(
                name='chk_deployments_status_valid',
                condition=Q(
                    status__in=[
                        DeploymentStatus.ACTIVE,
                        DeploymentStatus.BLOCKED,
                        DeploymentStatus.INACTIVE,
                        DeploymentStatus.REPLACED,
                        DeploymentStatus.FAILED,
                    ]
                ),
            ),
            models.UniqueConstraint(
                name='uq_deployments_user_version_number',
                fields=['user', 'version_number'],
            ),
        ]
        indexes = [
            models.Index(fields=['created_at'], name='idx_deployments_created_at'),
            models.Index(fields=['deleted_at'], name='idx_deployments_deleted_at'),
        ]

    def __str__(self):
        return f'{self.domain} ({self.user.email})'
