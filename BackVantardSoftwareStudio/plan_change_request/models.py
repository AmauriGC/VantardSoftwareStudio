# plan_change_requests/models.py
from django.db import models
from django.conf import settings

class PlanChangeRequest(models.Model):

    class Status(models.TextChoices):
        PENDING   = 'pending',   'Pending'
        APPROVED  = 'approved',  'Approved'
        REJECTED  = 'rejected',  'Rejected'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='plan_change_requests',
        help_text='Usuario que solicita el cambio de plan.'
    )

    current_plan = models.ForeignKey(
        'user_plans.UserPlan',
        on_delete=models.PROTECT,
        db_column='current_plan_id',
        related_name='change_requests_from',
        help_text='Plan actual del usuario (UserPlan activo).'
    )

    requested_plan = models.ForeignKey(
        'plans.Plan',
        on_delete=models.PROTECT,
        db_column='requested_plan_id',
        related_name='change_requests_to',
        help_text='Plan al que el usuario desea cambiar.'
    )

    months_requested = models.IntegerField(
        db_column='months_requested',
        help_text='Meses solicitados para el nuevo plan. Ej: 1, 3, 6, 12.',
        null=True,
        blank=True,
    )

    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        db_column='total_price',
        help_text='Monto total estimado para la solicitud (plan_price * meses).',
        null=True,
        blank=True,
    )

    reason = models.TextField(
        blank=True,
        default='',
        db_column='reason',
        help_text='Razón o motivo del cambio de plan.'
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_column='status',
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='reviewed_by_id',
        related_name='reviewed_plan_changes',
        help_text='Usuario administrador que revisó la solicitud.'
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        db_column='reviewed_at',
        help_text='Fecha y hora en que se revisó la solicitud.'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        db_column='completed_at',
        help_text='Fecha y hora en que se completó el cambio de plan.'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_column='created_at'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_column='updated_at'
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_column='deleted_at'
    )

    class Meta:
        db_table = 'plan_change_requests'
        ordering = ['-created_at']
        verbose_name = 'Plan Change Request'
        verbose_name_plural = 'Plan Change Requests'
        indexes = [
            models.Index(fields=['user'], name='idx_plan_change_req_user_id'),
            models.Index(fields=['current_plan'], name='idx_plan_change_req_current'),
            models.Index(fields=['requested_plan'], name='idx_plan_change_req_requested'),
            models.Index(fields=['status'], name='idx_plan_change_req_status'),
            models.Index(fields=['reviewed_by'], name='idx_plan_change_req_reviewer'),
            models.Index(fields=['created_at'], name='idx_plan_change_req_created_at'),
            models.Index(fields=['deleted_at'], name='idx_plan_change_req_deleted_at'),
        ]

    def __str__(self):
        return (
            f'{self.user.email} → '
            f'{self.current_plan.plan.name} to {self.requested_plan.name} '
            f'({self.status})'
        )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @property
    def is_pending(self) -> bool:
        return self.status == self.Status.PENDING and not self.is_deleted

    @property
    def is_approved(self) -> bool:
        return self.status == self.Status.APPROVED

    @property
    def is_completed(self) -> bool:
        return self.status == self.Status.COMPLETED

    def soft_delete(self):
        """Soft delete de la solicitud."""
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.status = self.Status.CANCELLED
        self.save(update_fields=['deleted_at', 'status', 'updated_at'])

    def approve(self, reviewed_by_user):
        """Aprobar la solicitud de cambio."""
        from django.utils import timezone
        self.status = self.Status.APPROVED
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

    def reject(self, reviewed_by_user):
        """Rechazar la solicitud de cambio."""
        from django.utils import timezone
        self.status = self.Status.REJECTED
        self.reviewed_by = reviewed_by_user
        self.reviewed_at = timezone.now()
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

    def complete(self):
        """Marcar como completada (cambio aplicado)."""
        from django.utils import timezone
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at', 'updated_at'])
