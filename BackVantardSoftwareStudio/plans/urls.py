from django.urls import path
from .views import PlanListView, PlanDetailView

urlpatterns = [
    path('',        PlanListView.as_view(),   name='plan-list'),
    path('<int:pk>/', PlanDetailView.as_view(), name='plan-detail'),
]
