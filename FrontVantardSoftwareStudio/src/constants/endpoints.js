// Centralización de endpoints del API.
// Regla: los servicios consumen estas constantes; nunca concatenar URLs en vistas.

export const ENDPOINTS = {
  auth: {
    register: "/api/users/register/",
    login: "/api/users/login/",
    refresh: "/api/users/refresh/",
    logout: "/api/users/logout/",
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
  },
  deploymentVersions: {
    upload: (deploymentId) => `/api/deployment-versions/${deploymentId}/upload/`,
    list: (deploymentId) => `/api/deployment-versions/${deploymentId}/`,
    detail: (deploymentId, versionId) => `/api/deployment-versions/${deploymentId}/${versionId}/`,
    rollback: (deploymentId, versionId) =>
      `/api/deployment-versions/${deploymentId}/${versionId}/rollback/`,
  },
};
