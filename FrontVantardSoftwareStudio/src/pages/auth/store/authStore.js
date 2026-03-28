// Re-exporta desde el módulo canónico en kernel.
// Cualquier importador de authStore no necesita cambiar su import.
export { getAuth, setAuth, clearAuth, getRole, isAuthenticated } from "../../../kernel/auth/authStorage";
