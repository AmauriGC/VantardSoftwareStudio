
from django.urls import path
from .views import (
    DeploymentListView,
    DeploymentDetailView,
    AdminDeploymentListView,
)

urlpatterns = [
    path('',            DeploymentListView.as_view(),   name='deployment-list'),
    path('<int:pk>/',   DeploymentDetailView.as_view(), name='deployment-detail'),
    path('admin/all/',  AdminDeploymentListView.as_view(), name='deployment-admin-list'),
]
