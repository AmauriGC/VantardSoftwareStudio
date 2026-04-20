from rest_framework import serializers
from .models import SystemLog

class SystemLogOutputSerializer(serializers.ModelSerializer):

    user_id = serializers.IntegerField(read_only=True)

    class Meta:
        model  = SystemLog
        fields = [
            'id',
            'user_id',
            'ip_address',
            'request_path',
            'action',
            'http_method',
            'status_code',
            'user_agent',
            'created_at',
        ]
        