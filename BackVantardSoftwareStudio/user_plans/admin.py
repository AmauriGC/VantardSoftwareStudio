from django.contrib import admin
from .models import UserPlan

@admin.register(UserPlan)
class UserPlanAdmin(admin.ModelAdmin):

    list_display  = (
        'id', 'user', 'plan', 'status', 'months_purchased',
        'total_price_paid', 'purchase_date', 'expiration_date',
        'days_remaining_display', 'deleted_at'
    )

    list_filter   = ('status', 'plan')
    search_fields = ('user__email', 'plan__name')
    ordering      = ('-purchase_date',)
    readonly_fields = ('created_at', 'updated_at', 'deleted_at')
    autocomplete_fields = ('user', 'plan')

    fieldsets = (
        ('Suscripcion', {
            'fields': ('user', 'plan', 'status')
        }),
        ('Facturacion', {
            'fields': ('months_purchased', 'total_price_paid', 'purchase_date', 'expiration_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'deleted_at'),
            'classes': ('collapse',)
        }),
    )

    @admin.display(description='Dias restantes')
    
    def days_remaining_display(self, obj):
        days = obj.days_remaining
        if days == 0:
            return 'Vencido'
        return f'{days} dias'