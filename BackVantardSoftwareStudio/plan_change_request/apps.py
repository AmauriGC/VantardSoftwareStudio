# plan_change_requests/apps.py
from django.apps import AppConfig

class PlanChangeRequestConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'plan_change_request'
    verbose_name = 'Plan Change Requests'
    
    def ready(self):
        """
        Importa signals si los necesitas en el futuro.
        Por ejemplo, para enviar notificaciones cuando cambie el estado.
        """
        pass
    