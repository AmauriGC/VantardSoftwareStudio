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
    adminCreate: "/api/users/admin/create/",
    adminUpdate: (id) => `/api/users/admin/${id}/`,
  },
  deployments: {
    list: "/api/deployments/",
    adminList: "/api/deployments/admin/all/",
    adminUpdateStatus: (id) => `/api/deployments/admin/${id}/status/`,
    detail: (id) => `/api/deployments/${id}/`,
    logs: (id) => `/api/deployments/${id}/logs/`,
    myLogs: "/api/deployments/logs/",
    traffic: "/api/deployments/traffic/",
  },
  plans: {
    list: "/api/plans/",
    adminList: "/api/plans/admin/",
    detail: (id) => `/api/plans/${id}/`,
  },
  planChangeRequests: {
    list: "/api/plan-change-requests/",
    mine: "/api/plan-change-requests/my/",
    cancel: (id) => `/api/plan-change-requests/${id}/cancel/`,
    apply: (id) => `/api/plan-change-requests/${id}/apply/`,
    adminList: "/api/plan-change-requests/admin/all/",
    adminApprove: (id) => `/api/plan-change-requests/admin/${id}/approve/`,
    adminReject: (id) => `/api/plan-change-requests/admin/${id}/reject/`,
  },
};
