from django.urls import path
from .views import PlanListView, PlanDetailView, AdminPlanListView

urlpatterns = [
    path('',            PlanListView.as_view(),      name='plan-list'),
    path('admin/',      AdminPlanListView.as_view(), name='plan-list-admin'),
    path('<int:pk>/',   PlanDetailView.as_view(),    name='plan-detail'),
]
