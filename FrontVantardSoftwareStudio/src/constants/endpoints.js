// Centralización de endpoints del API.
// Regla: los servicios consumen estas constantes; nunca concatenar URLs en vistas.

export const ENDPOINTS = {
  auth: {
    login: "/auth/login/",
    recover: "/auth/recover/",
    reset: "/auth/reset/",
  },
  users: {
    list: "/api/usuarios/",
    detail: (id) => `/api/usuarios/${id}/`,
  },
};
