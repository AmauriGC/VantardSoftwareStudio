from django.contrib import admin

from .models import ActiveUserWithPlan


@admin.register(ActiveUserWithPlan)
class ActiveUserWithPlanAdmin(admin.ModelAdmin):
	list_display = ('id', 'first_name', 'email', 'plan_name', 'expiration_date')
	ordering = ('id',)
	search_fields = ('first_name', 'email', 'plan_name')

	def has_add_permission(self, request):
		return False

	def has_change_permission(self, request, obj=None):
		return False

	def has_delete_permission(self, request, obj=None):
		return False
