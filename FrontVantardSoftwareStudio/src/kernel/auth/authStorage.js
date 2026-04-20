// Módulo canónico de almacenamiento de autenticación.
// Usado por authStore (dominio) y axiosClient (infraestructura).
// Clave única: "vss.auth" → objeto { role, email }

const AUTH_KEY = "vss.auth";

export function getAuth() {
  try {
    const raw = globalThis.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setAuth(auth) {
  if (!auth || typeof auth !== "object") return;
  try {
    const normalized = {
      role: auth.role ?? null,
      email: auth.email ?? null,
      user: auth.user ?? null,
      accessToken: auth.accessToken ?? null,
      refreshToken: auth.refreshToken ?? null,
    };
    globalThis.localStorage.setItem(AUTH_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

export function clearAuth() {
  try {
    globalThis.localStorage.removeItem(AUTH_KEY);
  } catch {
    // ignore
  }
}

export function getRole() {
  return getAuth()?.role ?? null;
}

export function getAccessToken() {
  return getAuth()?.accessToken ?? null;
}

export function getRefreshToken() {
  return getAuth()?.refreshToken ?? null;
}

export function isAuthenticated() {
  const auth = getAuth();
  return Boolean(auth?.role && auth?.accessToken);
}
