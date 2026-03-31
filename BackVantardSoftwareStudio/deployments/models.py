from django.db import models
from django.conf import settings

class Deployment(models.Model):

    class Status(models.TextChoices):
        ACTIVE   = 'active',   'Active'
        INACTIVE = 'inactive', 'Inactive'
        FAILED   = 'failed',   'Failed'
        ARCHIVED = 'archived', 'Archived'

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
        choices=Status.choices,
        default=Status.ACTIVE,
        db_column='status'
    )

    created_at = models.DateTimeField(auto_now_add=True, db_column='created_at')
    updated_at = models.DateTimeField(auto_now=True, db_column='updated_at')
    deleted_at = models.DateTimeField(null=True, blank=True, db_column='deleted_at')

    class Meta:
        db_table = 'deployments'
        ordering = ['-created_at']
        verbose_name = 'Deployment'
        verbose_name_plural = 'Deployments'
        indexes = [
            models.Index(fields=['user'], name='idx_deployments_user_id'),
            models.Index(fields=['status'], name='idx_deployments_status'),
            models.Index(fields=['created_at'], name='idx_deployments_created_at'),
            models.Index(fields=['deleted_at'], name='idx_deployments_deleted_at'),
        ]

    def __str__(self):
        return f'{self.domain} ({self.user.email})'

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def soft_delete(self):
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.status = self.Status.ARCHIVED
        self.save(update_fields=['deleted_at', 'status', 'updated_at'])
