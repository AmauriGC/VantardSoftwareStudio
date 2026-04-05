from django.db import models

class DeploymentVersion(models.Model):

    class Status(models.TextChoices):
        ACTIVE   = 'active',   'Active'
        REPLACED = 'replaced', 'Replaced'
        FAILED   = 'failed',   'Failed'

    deployment = models.ForeignKey(
        'deployments.Deployment',
        on_delete=models.CASCADE,
        db_column='deployment_id',
        related_name='versions',
        help_text='Deployment al que pertenece esta version.'
    )

    version_number = models.IntegerField(
        db_column='version_number',
        help_text='Numero de version incremental dentro del deployment. Ej: 1, 2, 3...'
    )

    zip_filename = models.CharField(
        max_length=255,
        db_column='zip_filename',
        help_text='Nombre original del archivo .zip subido. Ej: mi-sitio-v2.zip'
    )

    zip_path = models.CharField(
        max_length=500,
        db_column='zip_path',
        help_text='Ruta en el servidor donde se almacena el .zip. Ej: uploads/deployments/1/v2/mi-sitio.zip'
    )

    disk_used_mb = models.IntegerField(
        default=0,
        db_column='disk_used_mb',
        help_text='Espacio en disco que ocupa esta version en MB.'
    )

    traffic_log_path = models.CharField(
        max_length=500,
        blank=True,
        default='',
        db_column='traffic_log_path',
        help_text='Ruta al archivo de log de trafico de esta version. Puede estar vacio.'
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_column='status',
    )

    created_at = models.DateTimeField(auto_now_add=True, db_column='created_at')
    updated_at = models.DateTimeField(auto_now=True,     db_column='updated_at')
    deleted_at = models.DateTimeField(null=True, blank=True, db_column='deleted_at')

    class Meta:
        db_table        = 'deployment_versions'
        ordering        = ['-version_number']
        verbose_name    = 'Deployment Version'
        verbose_name_plural = 'Deployment Versions'

        constraints = [
            models.UniqueConstraint(
                fields=['deployment', 'version_number'],
                name='uq_deployment_version_number'
            )
        ]
        indexes = [
            models.Index(fields=['deployment'],    name='idx_depver_deployment_id'),
            models.Index(fields=['status'],        name='idx_depver_status'),
            models.Index(fields=['version_number'],name='idx_depver_version_number'),
            models.Index(fields=['created_at'],    name='idx_depver_created_at'),
            models.Index(fields=['deleted_at'],    name='idx_depver_deleted_at'),
        ]

    def __str__(self):
        return f'{self.deployment.domain} — v{self.version_number} ({self.status})'

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE and not self.is_deleted

    def soft_delete(self):
        """Archiva la version sin eliminarla fisicamente de la BD."""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.status     = self.Status.REPLACED
        self.save(update_fields=['deleted_at', 'status', 'updated_at'])

    @classmethod
    def get_next_version_number(cls, deployment_id: int) -> int:

        last = (
            cls.objects
            .filter(deployment_id=deployment_id)
            .order_by('-version_number')
            .values_list('version_number', flat=True)
            .first()
        )
        return (last or 0) + 1
    