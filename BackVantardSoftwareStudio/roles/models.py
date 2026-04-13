from django.db import models


class Role(models.Model):
    
    role_name = models.CharField(
        max_length=50,
        unique=True,
        db_column='role_name',
        help_text='Nombre del rol, ej: Admin, User, Moderator.'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_column='created_at'
    )

    class Meta:
        db_table = 'roles'
        ordering = ['role_name']
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.role_name
    