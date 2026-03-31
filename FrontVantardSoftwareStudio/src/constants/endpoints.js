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
};
