
from django.urls import path
from .views import (
    DeploymentListView,
    DeploymentDetailView,
    DeploymentLogsView,
    DeploymentTrafficView,
    AdminDeploymentListView,
)

urlpatterns = [
    path('',            DeploymentListView.as_view(),   name='deployment-list'),
    path('traffic/',    DeploymentTrafficView.as_view(), name='deployment-traffic'),
    path('<int:pk>/logs/', DeploymentLogsView.as_view(), name='deployment-logs'),
    path('<int:pk>/',   DeploymentDetailView.as_view(), name='deployment-detail'),
    path('admin/all/',  AdminDeploymentListView.as_view(), name='deployment-admin-list'),
]
