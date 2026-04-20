from django.urls import path
from .views import SystemLogListView, SystemLogDetailView

urlpatterns = [
    path('', SystemLogListView.as_view(),        name='system-log-list'),
    path('<int:pk>/', SystemLogDetailView.as_view(), name='system-log-detail'),
]
