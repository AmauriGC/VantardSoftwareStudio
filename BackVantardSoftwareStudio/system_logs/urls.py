from django.urls import path
from .views import SystemLogListView, SystemLogDetailView, SystemLogDownloadView

urlpatterns = [
    path('', SystemLogListView.as_view(),            name='system-log-list'),
    path('download/', SystemLogDownloadView.as_view(), name='system-log-download'),
    path('<int:pk>/', SystemLogDetailView.as_view(),  name='system-log-detail'),
]
