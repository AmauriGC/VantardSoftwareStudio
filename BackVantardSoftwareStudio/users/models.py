from django.db import models
from django.db.models import Q
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import UserManager


class UserStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    BLOCKED = 'blocked', 'Blocked'

class User(AbstractBaseUser, PermissionsMixin):

    Status = UserStatus

    first_name = models.CharField(
        max_length=100,
        db_column='first_name',
    )

    last_name = models.CharField(
        max_length=100,
        db_column='last_name',
    )

    email = models.EmailField(
        max_length=150,
        unique=True,
        db_column='email',
    )

    password = models.CharField(
        max_length=255,
        db_column='password_hash', 
    )

    role = models.ForeignKey(
        'roles.Role',
        on_delete=models.PROTECT,
        db_column='role_id',
        related_name='users',
        null=False,
        blank=False,
        help_text='Rol del usuario.'
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

    is_staff  = models.BooleanField(default=False)   
    is_active = models.BooleanField(default=True)    

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']   

    class Meta:
        db_table        = 'users' 
        ordering        = ['-created_at']
        verbose_name    = 'User'
        verbose_name_plural = 'Users'
        constraints = [
            models.CheckConstraint(
                name='chk_users_status_valid',
                    condition=Q(status__in=['active', 'blocked']),
            ),
        ]
        indexes = [
            models.Index(fields=['deleted_at'], name='idx_users_deleted_at'),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name} <{self.email}>'

    @property
    def full_name(self) -> str:
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_deleted(self) -> bool:    
        return self.deleted_at is not None
    
    @property
    def is_admin(self) -> bool:
        return self.role and self.role.role_name == 'Admin'

    def soft_delete(self):
        
        from django.utils import timezone
        self.deleted_at = timezone.now()
        self.status     = self.Status.BLOCKED
        self.is_active  = False
        self.save(update_fields=['deleted_at', 'status', 'is_active', 'updated_at'])
        