from rest_framework import serializers
from .models import DeploymentVersion

class DeploymentVersionOutputSerializer(serializers.ModelSerializer):
    deployment_domain = serializers.CharField(source='deployment.domain')

    class Meta:
        model  = DeploymentVersion
        fields = [
            'id',
            'deployment_domain',
            'version_number',
            'zip_filename',
            'disk_used_mb',
            'status',
            'created_at',
        ]