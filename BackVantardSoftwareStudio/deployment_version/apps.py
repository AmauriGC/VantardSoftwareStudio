from django.apps import AppConfig


class DeploymentVersionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'deployment_version'
    verbose_name = 'Deployment Version'