import axios from 'axios';

import { ENDPOINTS } from '../constants/endpoints.js';
import { ENV } from '../config/env.js';
import { clearAuth, getAccessToken, getAuth, getRefreshToken, setAuth } from './auth/authStorage.js';

const SESSION_EXPIRED_KEY = "vss.sessionExpired";

function markSessionExpired() {
  try {
    globalThis.sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
  } catch {
    // ignore
  }
}

function getFirstValidationMessage(payload) {
  if (payload == null) return null;

  if (typeof payload === "string") return payload;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const nested = getFirstValidationMessage(item);
      if (nested) return nested;
    }
    return null;
  }

  if (typeof payload === "object") {
    for (const value of Object.values(payload)) {
      const nested = getFirstValidationMessage(value);
      if (nested) return nested;
    }
  }

  return null;
}

export function normalizeAxiosError(error) {
  const response = error?.response;
  const data = response?.data;
  const status = response?.status ?? null;

  const topMessage =
    (typeof data === "object" && data !== null && (data.message || data.detail)) ||
    (typeof data === "string" ? data : null) ||
    null;

  const nestedValidationMessage =
    typeof data === "object" && data !== null ? getFirstValidationMessage(data.data) : null;

  const message =
    nestedValidationMessage ||
    topMessage ||
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

const refreshClient = axios.create({
  baseURL: ENV.API_URL,
});

function isAuthEndpoint(url = "") {
  return [
    ENDPOINTS.auth.login,
    ENDPOINTS.auth.register,
    ENDPOINTS.auth.refresh,
  ].some((endpoint) => String(url).includes(endpoint));
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error("No hay refresh token disponible.");
      }

      const response = await refreshClient.post(ENDPOINTS.auth.refresh, {
        refresh: refreshToken,
      });

      const payload = response?.data?.data ?? {};
      const nextAccessToken = payload?.access_token ?? null;
      const nextRefreshToken = payload?.refresh_token ?? refreshToken;

      if (!nextAccessToken) {
        throw new Error("El backend no devolvió access token.");
      }

      const currentAuth = getAuth() ?? {};
      setAuth({
        ...currentAuth,
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      });

      return nextAccessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

axiosClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const normalized = normalizeAxiosError(error);
    error.normalized = normalized;
    const originalRequest = error?.config ?? {};
    const shouldAttemptRefresh =
      normalized.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url);

    if (shouldAttemptRefresh) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch {
        clearAuth();
        markSessionExpired();

        if (globalThis.window !== undefined) {
          globalThis.location.replace("/");
        }
      }
    }

    if (normalized.status === 401) {
      clearAuth();
      markSessionExpired();

      if (globalThis.window !== undefined) {
        globalThis.location.replace("/");
      }
    }

    return Promise.reject(error);
  }
);
