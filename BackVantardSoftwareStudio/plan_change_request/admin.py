# plan_change_requests/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import PlanChangeRequest

@admin.register(PlanChangeRequest)
class PlanChangeRequestAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user_email',
        'current_plan_name',
        'requested_plan_name',
        'status_badge',
        'created_at',
        'reviewed_at',
    )
    
    list_filter = (
        'status',
        'created_at',
        'reviewed_at',
        'completed_at',
    )
    
    search_fields = (
        'user__email',
        'user__first_name',
        'user__last_name',
        'current_plan__plan__name',
        'requested_plan__name',
        'reason',
    )
    
    readonly_fields = (
        'id',
        'created_at',
        'updated_at',
        'deleted_at',
        'reviewed_at',
        'completed_at',
    )
    
    fieldsets = (
        ('Información del Usuario', {
            'fields': ('user', 'reason')
        }),
        ('Planes', {
            'fields': ('current_plan', 'requested_plan')
        }),
        ('Estado de la Solicitud', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'completed_at')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )
    
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    actions = [
        'approve_requests',
        'reject_requests',
        'mark_as_completed',
        'soft_delete_requests',
    ]

    def user_email(self, obj):
        """Muestra el email del usuario."""
        return obj.user.email
    user_email.short_description = 'Usuario'
    user_email.admin_order_field = 'user__email'

    def current_plan_name(self, obj):
        """Muestra el nombre del plan actual."""
        return obj.current_plan.plan.name
    current_plan_name.short_description = 'Plan Actual'
    current_plan_name.admin_order_field = 'current_plan__plan__name'

    def requested_plan_name(self, obj):
        """Muestra el nombre del plan solicitado."""
        return obj.requested_plan.name
    requested_plan_name.short_description = 'Plan Solicitado'
    requested_plan_name.admin_order_field = 'requested_plan__name'

    def status_badge(self, obj):
        """Muestra un badge de color según el estado."""
        colors = {
            'pending': '#ffc107',    # Amarillo
            'approved': '#28a745',   # Verde
            'rejected': '#dc3545',   # Rojo
            'completed': '#007bff',  # Azul
            'cancelled': '#6c757d',  # Gris
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Estado'
    status_badge.admin_order_field = 'status'

    def approve_requests(self, request, queryset):
        """Acción para aprobar solicitudes pendientes."""
        pending = queryset.filter(status=PlanChangeRequest.Status.PENDING)
        count = 0
        for obj in pending:
            obj.approve(reviewed_by_user=request.user)
            count += 1
        
        self.message_user(
            request,
            f'{count} solicitud(es) aprobada(s) exitosamente.'
        )
    approve_requests.short_description = 'Aprobar solicitudes seleccionadas'

    def reject_requests(self, request, queryset):
        """Acción para rechazar solicitudes pendientes."""
        pending = queryset.filter(status=PlanChangeRequest.Status.PENDING)
        count = 0
        for obj in pending:
            obj.reject(reviewed_by_user=request.user)
            count += 1
        
        self.message_user(
            request,
            f'{count} solicitud(es) rechazada(s) exitosamente.'
        )
    reject_requests.short_description = 'Rechazar solicitudes seleccionadas'

    def mark_as_completed(self, request, queryset):
        """Acción para marcar como completadas."""
        approved = queryset.filter(status=PlanChangeRequest.Status.APPROVED)
        count = 0
        for obj in approved:
            obj.complete()
            count += 1
        
        self.message_user(
            request,
            f'{count} solicitud(es) marcada(s) como completada(s).'
        )
    mark_as_completed.short_description = 'Marcar como completadas'

    def soft_delete_requests(self, request, queryset):
        """Acción para soft delete."""
        count = 0
        for obj in queryset:
            if not obj.is_deleted:
                obj.soft_delete()
                count += 1
        
        self.message_user(
            request,
            f'{count} solicitud(es) eliminada(s) (soft delete).'
        )
    soft_delete_requests.short_description = 'Eliminar solicitudes (soft delete)'

    def get_queryset(self, request):
        """Optimiza queries con select_related."""
        qs = super().get_queryset(request)
        return qs.select_related(
            'user',
            'current_plan',
            'current_plan__plan',
            'requested_plan',
            'reviewed_by'
        )