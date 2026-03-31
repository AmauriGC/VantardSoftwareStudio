from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):

    list_display  = ('id', 'email', 'full_name', 'status', 'is_staff', 'created_at', 'deleted_at')
    list_filter   = ('status', 'is_staff', 'is_superuser')
    search_fields = ('email', 'first_name', 'last_name')
    ordering      = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'deleted_at', 'last_login')

    fieldsets = (
        (_('Credenciales'),   {'fields': ('email', 'password')}),
        (_('Información'),    {'fields': ('first_name', 'last_name')}),
        (_('Estado'),         {'fields': ('status', 'is_active', 'is_staff', 'is_superuser')}),
        (_('Permisos'),       {'fields': ('groups', 'user_permissions')}),
        (_('Timestamps'),     {'fields': ('created_at', 'updated_at', 'deleted_at', 'last_login')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'status'),
        }),
    )

    filter_horizontal = ('groups', 'user_permissions')
