from django.urls import path
from .views import (
    PurchasePlanView,
    ActivePlanView,
    UserPlanHistoryView,
    CancelPlanView,
    AdminUserPlanListView,
)

urlpatterns = [
    path('purchase/',     PurchasePlanView.as_view(),     name='user-plan-purchase'),
    path('active/',       ActivePlanView.as_view(),       name='user-plan-active'),
    path('history/',      UserPlanHistoryView.as_view(),  name='user-plan-history'),
    path('cancel/',       CancelPlanView.as_view(),       name='user-plan-cancel'),
    path('admin/all/',    AdminUserPlanListView.as_view(), name='user-plan-admin-list'),
]

