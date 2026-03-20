import axios from 'axios';

import { ENV } from '../config/env.js';

const AUTH_KEY = "vss.auth";
const SESSION_EXPIRED_KEY = "vss.sessionExpired";

function clearAuthStorage() {
  try {
    window.localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

function markSessionExpired() {
  try {
    window.sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
  } catch {
    // ignore
  }
}

export function normalizeAxiosError(error) {
  const response = error?.response;
  const data = response?.data;
  const status = response?.status ?? null;

  const message =
    (typeof data === "object" && data !== null && (data.message || data.detail)) ||
    (typeof data === "string" ? data : null) ||
    error?.message ||
    "Ocurrió un error inesperado.";

  return {
    status,
    message,
    data,
    code: error?.code ?? null,
    isNetworkError: !response,
  };
}

export const axiosClient = axios.create({
  baseURL: ENV.API_URL,
});

let handling401 = false;

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeAxiosError(error);
    error.normalized = normalized;

    if (normalized.status === 401 && !handling401) {
      handling401 = true;
      clearAuthStorage();
      markSessionExpired();

      if (typeof window !== "undefined") {
        window.location.replace("/");
      }
    }

    return Promise.reject(error);
  }
);
