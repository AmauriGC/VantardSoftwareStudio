from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    RefreshTokenView,
    LogoutView,
    ProfileView,
    ChangePasswordView,
    DeleteAccountView,
    UserListView,
    UserUpdateStatusView,
    AdminCreateUserView,
    AdminUpdateUserView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    # Auth
    path('register/',      RegisterView.as_view(),      name='user-register'),
    path('login/',         LoginView.as_view(),          name='user-login'),
    path('refresh/',       RefreshTokenView.as_view(),   name='user-token-refresh'),
    path('logout/',        LogoutView.as_view(),         name='user-logout'),

    # Perfil del usuario autenticado
    path('profile/',           ProfileView.as_view(),       name='user-profile'),
    path('profile/password/',  ChangePasswordView.as_view(), name='user-change-password'),
    path('profile/delete/',    DeleteAccountView.as_view(),  name='user-delete-account'),

    # Admin
    path('',                        UserListView.as_view(),          name='user-list'),
    path('<int:pk>/status/',        UserUpdateStatusView.as_view(),  name='user-update-status'),
    path('admin/create/',           AdminCreateUserView.as_view(),   name='admin-create-user'),
    path('admin/<int:pk>/',         AdminUpdateUserView.as_view(),   name='admin-update-user'),

    # Recuperación de contraseña
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
