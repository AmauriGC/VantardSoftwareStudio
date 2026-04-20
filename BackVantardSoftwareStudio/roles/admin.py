from django.contrib import admin
from .models import Role

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'role_name', 'created_at', 'user_count')
    search_fields = ('role_name',)
    readonly_fields = ('id', 'created_at')
    ordering = ('role_name',)
    
    fieldsets = (
        ('Información del Rol', {
            'fields': ('role_name',)
        }),
        ('Auditoría', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_count(self, obj):
        """Cuenta cuántos usuarios tienen este rol."""
        return obj.users.count()
    user_count.short_description = 'Usuarios'