
from django.urls import path
from .views import (
    DeploymentListView,
    DeploymentDetailView,
    DeploymentLogsView,
    UserDeploymentLogsListView,
    DeploymentTrafficView,
    AdminDeploymentListView,
    AdminDeploymentStatusView,
    UploadVersionView,
    VersionListView,
    VersionDetailView,
    RollbackVersionView,
)

urlpatterns = [
    path('',            DeploymentListView.as_view(),   name='deployment-list'),
    path('traffic/',    DeploymentTrafficView.as_view(), name='deployment-traffic'),
    path('logs/',       UserDeploymentLogsListView.as_view(), name='deployment-my-logs'),
    path('<int:pk>/logs/', DeploymentLogsView.as_view(), name='deployment-logs'),
    path('<int:pk>/',   DeploymentDetailView.as_view(), name='deployment-detail'),
    path('admin/all/',  AdminDeploymentListView.as_view(), name='deployment-admin-list'),
    path('admin/<int:pk>/status/', AdminDeploymentStatusView.as_view(), name='deployment-admin-status'),
]


# Legacy: endpoints consumidos por el frontend bajo /api/deployment-versions/
version_urlpatterns = [
    path('<int:deployment_id>/upload/', UploadVersionView.as_view(), name='version-upload'),
    path('<int:deployment_id>/', VersionListView.as_view(), name='version-list'),
    path('<int:deployment_id>/<int:pk>/', VersionDetailView.as_view(), name='version-detail'),
    path('<int:deployment_id>/<int:pk>/rollback/', RollbackVersionView.as_view(), name='version-rollback'),
]
