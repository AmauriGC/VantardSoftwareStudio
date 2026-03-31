from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Deployment

@admin.register(Deployment)
class DeploymentAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'domain',
        'user',
        'status',
        'disk_used_mb',
        'traffic_visit_count',
        'created_at',
        'deleted_at',
    )

    list_filter = ('status', 'created_at')
    search_fields = ('domain', 'site_url', 'user__email')
    ordering = ('-created_at',)

    readonly_fields = ('created_at', 'updated_at', 'deleted_at')

    fieldsets = (
        (_('Información Principal'), {
            'fields': ('user', 'domain', 'site_url')
        }),
        (_('Uso del Sistema'), {
            'fields': ('disk_used_mb', 'traffic_visit_count')
        }),
        (_('Estado'), {
            'fields': ('status',)
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at', 'deleted_at')
        }),
    )