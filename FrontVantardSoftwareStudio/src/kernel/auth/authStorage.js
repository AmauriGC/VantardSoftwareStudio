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
  try {
    globalThis.localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
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

export function isAuthenticated() {
  return Boolean(getAuth()?.role);
}
