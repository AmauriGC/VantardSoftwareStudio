from django.contrib import admin
from .models import SystemLog

@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display  = ('id', 'http_method', 'request_path', 'status_code', 'action', 'ip_address', 'user_id', 'created_at')
    list_filter   = ('http_method', 'status_code', 'action')
    search_fields = ('ip_address', 'request_path', 'action', 'user_agent')
    readonly_fields = [f.name for f in SystemLog._meta.get_fields()] 
    ordering      = ('-created_at',)

    def has_add_permission(self, request):
        return False  

    def has_change_permission(self, request, obj=None):
        return False  
