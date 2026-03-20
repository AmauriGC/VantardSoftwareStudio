const ROLE_KEY = "vss.role";

export function getRole() {
  try {
    return window.localStorage.getItem(ROLE_KEY);
  } catch {
    return null;
  }
}

export function setRole(role) {
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    // ignore
  }
}

export function clearRole() {
  try {
    window.localStorage.removeItem(ROLE_KEY);
  } catch {
    // ignore
  }
}
