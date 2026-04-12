from django.urls import path, include
from core import views as core
from django.contrib import admin
from deployments.views import serve_site_file
from deployments.urls import version_urlpatterns

urlpatterns = [
    path("", core.home, name="home"),
    path('admin/', admin.site.urls),
    path('sites/<str:domain>/', serve_site_file, name='site-index'),
    path('sites/<str:domain>/<path:file_path>', serve_site_file, name='site-file'),

    # --- System Logs ---
    path('api/system-logs/', include('system_logs.urls')),
    path('api/users/', include('users.urls')),
    path('api/plans/', include('plans.urls')),
    path('api/user-plans/', include('user_plans.urls')),
    path('api/plan-change-requests/', include('plan_change_request.urls')),
    path('api/roles/', include('roles.urls')),
    path('api/deployments/', include('deployments.urls')),
    path('api/deployment-versions/', include(version_urlpatterns)),
    
    # Aqui iras agregando las demas apps:
    # path('api/auth/',        include('auth_app.urls')),
]

