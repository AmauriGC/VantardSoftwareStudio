from django.contrib import admin
from .models import DeploymentVersion

@admin.register(DeploymentVersion)
class DeploymentVersionAdmin(admin.ModelAdmin):
    
    list_display  = (
        'id', 'deployment', 'version_number', 'zip_filename',
        'disk_used_mb', 'status', 'created_at', 'deleted_at'
    )

    list_filter   = ('status',)
    search_fields = ('zip_filename', 'deployment__domain')
    ordering      = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'deleted_at')
    autocomplete_fields = ('deployment',)

    fieldsets = (
        ('Deployment',    {'fields': ('deployment', 'version_number', 'status')}),
        ('Archivo ZIP',   {'fields': ('zip_filename', 'zip_path', 'disk_used_mb')}),
        ('Trafico',       {'fields': ('traffic_log_path',)}),
        ('Timestamps',    {'fields': ('created_at', 'updated_at', 'deleted_at'), 'classes': ('collapse',)}),
    )

