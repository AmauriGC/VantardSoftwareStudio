from django.db import models
from django.db.models import Q


class PlanStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    INACTIVE = 'inactive', 'Inactive'


class Plan(models.Model):

    Status = PlanStatus

    name = models.CharField(
        max_length=50,
        unique=True,
        db_column='name',
        help_text='Nombre del plan, ej: Free, Basic, Pro, Enterprise.'
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        db_column='price',
        help_text='Precio del plan en USD. Ej: 0.00 para Free, 9.99 para Basic.'
    )

    max_disk_mb = models.IntegerField(
        db_column='max_disk_mb',
        help_text='Límite de almacenamiento en MB. Ej: 500, 2048, 10240.'
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
        db_table        = 'plans'
        ordering        = ['price']
        verbose_name    = 'Plan'
        verbose_name_plural = 'Plans'
        constraints = [
            models.CheckConstraint(
                name='chk_plans_status_valid',
                condition=Q(status__in=['active', 'inactive']),
            ),
        ]
        indexes = [
            models.Index(fields=['deleted_at'], name='idx_plans_deleted_at'),
        ]

    def __str__(self):
        return f'{self.name} (${self.price}/mes)'

    @property
    def is_free(self):
        return self.price == 0

    @property
    def max_disk_gb(self):
        
        return round(self.max_disk_mb / 1024, 2)

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def soft_delete(self):
        
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.status     = self.Status.INACTIVE
        self.save(update_fields=['deleted_at', 'status', 'updated_at'])