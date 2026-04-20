from django.contrib import admin
from .models import Plan

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display   = ('id', 'name', 'price', 'max_disk_mb', 'max_disk_gb_display', 'status', 'created_at', 'deleted_at')
    list_filter    = ('status',)
    search_fields  = ('name',)
    ordering       = ('price',)
    readonly_fields = ('created_at', 'updated_at', 'deleted_at')

    fieldsets = (
        ('Información del Plan', {'fields': ('name', 'price', 'max_disk_mb', 'status')}),
        ('Timestamps',           {'fields': ('created_at', 'updated_at', 'deleted_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Disco (GB)')
    def max_disk_gb_display(self, obj):
        return f'{obj.max_disk_gb} GB'
    