// Centralización de endpoints del API.
// Regla: los servicios consumen estas constantes; nunca concatenar URLs en vistas.

export const ENDPOINTS = {
  auth: {
    register: "/api/users/register/",
    login: "/api/users/login/",
    refresh: "/api/users/refresh/",
    logout: "/api/users/logout/",
    passwordResetRequest: "/api/users/password-reset/request/",
    passwordResetConfirm: "/api/users/password-reset/confirm/",
  },
  users: {
    profile: "/api/users/profile/",
    changePassword: "/api/users/profile/password/",
    deleteAccount: "/api/users/profile/delete/",
    list: "/api/users/",
    updateStatus: (id) => `/api/users/${id}/status/`,
  },
  deployments: {
    list: "/api/deployments/",
    detail: (id) => `/api/deployments/${id}/`,
    logs: (id) => `/api/deployments/${id}/logs/`,
    traffic: "/api/deployments/traffic/",
    trafficSummary: "/api/deployments/traffic/summary/",
  },
  deploymentVersions: {
    upload: (deploymentId) => `/api/deployment-versions/${deploymentId}/upload/`,
    list: (deploymentId) => `/api/deployment-versions/${deploymentId}/`,
    detail: (deploymentId, versionId) => `/api/deployment-versions/${deploymentId}/${versionId}/`,
    rollback: (deploymentId, versionId) =>
      `/api/deployment-versions/${deploymentId}/${versionId}/rollback/`,
  },
  plans: {
    list: "/api/plans/",
  },
  planChangeRequests: {
    list: "/api/plan-change-requests/",
    mine: "/api/plan-change-requests/my/",
  },
};
