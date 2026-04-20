from django.urls import path
from .views import RoleListView, RoleDetailView

urlpatterns = [
    path('',         RoleListView.as_view(),   name='role-list'),
    path('<int:pk>/', RoleDetailView.as_view(), name='role-detail'),
]

