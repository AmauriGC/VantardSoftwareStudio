from django.db import models
from django.conf import settings

class UserPlan(models.Model):

    class Status(models.TextChoices):
        ACTIVE  = 'active',  'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='user_plans',
        help_text='Usuario que adquirio el plan.'
    )
    
    plan = models.ForeignKey(
        'plans.Plan',
        on_delete=models.PROTECT,       
        db_column='plan_id',
        related_name='user_plans',
        help_text='Plan adquirido.'
    )

    purchase_date = models.DateTimeField(
        db_column='purchase_date',
        help_text='Fecha y hora en que se realizo la compra.'
    )
    
    expiration_date = models.DateTimeField(
        db_column='expiration_date',
        help_text='Fecha y hora en que vence la suscripcion.'
    )
    
    months_purchased = models.IntegerField(
        db_column='months_purchased',
        help_text='Cantidad de meses comprados en esta suscripcion. Ej: 1, 3, 6, 12.'
    )
    
    total_price_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        db_column='total_price_paid',
        help_text='Precio total pagado en USD (precio_plan * meses). Ej: 29.97 por 3 meses a 9.99.'
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_column='status',
    )

    created_at  = models.DateTimeField(auto_now_add=True, db_column='created_at')
    updated_at  = models.DateTimeField(auto_now=True,     db_column='updated_at')
    deleted_at  = models.DateTimeField(null=True, blank=True, db_column='deleted_at')

    class Meta:
        db_table        = 'user_plans'
        ordering        = ['-purchase_date']
        verbose_name    = 'User Plan'
        verbose_name_plural = 'User Plans'
        indexes = [
            models.Index(fields=['user'],            name='idx_user_plans_user_id'),
            models.Index(fields=['plan'],            name='idx_user_plans_plan_id'),
            models.Index(fields=['status'],          name='idx_user_plans_status'),
            models.Index(fields=['purchase_date'],   name='idx_user_plans_purchase_date'),
            models.Index(fields=['expiration_date'], name='idx_user_plans_expiration_date'),
            models.Index(fields=['deleted_at'],      name='idx_user_plans_deleted_at'),
        ]

    def __str__(self):
        return f'{self.user.email} → {self.plan.name} ({self.status})'

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    @property
    def is_active(self) -> bool:
        from django.utils import timezone
        return (
            self.status == self.Status.ACTIVE
            and self.expiration_date > timezone.now()
            and not self.is_deleted
        )

    @property
    def days_remaining(self) -> int:

        from django.utils import timezone
        delta = self.expiration_date - timezone.now()
        return max(delta.days, 0)

    def cancel(self):

        from django.utils import timezone
        self.status = self.Status.CANCELLED
        self.save(update_fields=['status', 'updated_at'])

    def soft_delete(self):

        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.status     = self.Status.EXPIRED
        self.save(update_fields=['deleted_at', 'status', 'updated_at'])

    @classmethod
    def calculate_total(cls, plan_price: float, months: int) -> float:

        return round(plan_price * months, 2)
    