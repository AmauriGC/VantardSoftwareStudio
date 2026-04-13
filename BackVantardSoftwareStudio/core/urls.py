from django.urls import path

from .views import AdminDashboardView, UserDashboardView

urlpatterns = [
    path('dashboard/admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('dashboard/user/', UserDashboardView.as_view(), name='user-dashboard'),
]
