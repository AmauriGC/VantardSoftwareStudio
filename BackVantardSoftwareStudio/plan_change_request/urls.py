from django.urls import path
from .views import (
    CreatePlanChangeRequestView,
    MyPlanChangeRequestsView,
    CancelPlanChangeRequestView,
    ApplyPlanChangeRequestNowView,
    AdminPlanChangeRequestListView,
    AdminApprovePlanChangeRequestView,
    AdminRejectPlanChangeRequestView,
)

urlpatterns = [
    path('',                  CreatePlanChangeRequestView.as_view(),        name='plan-change-request-create'),
    path('my/',               MyPlanChangeRequestsView.as_view(),          name='plan-change-request-my'),
    path('<int:pk>/cancel/',  CancelPlanChangeRequestView.as_view(),       name='plan-change-request-cancel'),
    path('<int:pk>/apply/',   ApplyPlanChangeRequestNowView.as_view(),     name='plan-change-request-apply-now'),
    path('admin/all/',        AdminPlanChangeRequestListView.as_view(),    name='plan-change-request-admin-list'),
    path('admin/<int:pk>/approve/', AdminApprovePlanChangeRequestView.as_view(), name='plan-change-request-approve'),
    path('admin/<int:pk>/reject/',  AdminRejectPlanChangeRequestView.as_view(),  name='plan-change-request-reject'),
]

