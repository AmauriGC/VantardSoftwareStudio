from django.urls import path
from .views import (
    UploadVersionView,
    VersionListView,
    VersionDetailView,
    RollbackVersionView,
)

urlpatterns = [
    path('<int:deployment_id>/upload/',             UploadVersionView.as_view(),  name='version-upload'),
    path('<int:deployment_id>/',                    VersionListView.as_view(),    name='version-list'),
    path('<int:deployment_id>/<int:pk>/',           VersionDetailView.as_view(),  name='version-detail'),
    path('<int:deployment_id>/<int:pk>/rollback/',  RollbackVersionView.as_view(), name='version-rollback'),
]

