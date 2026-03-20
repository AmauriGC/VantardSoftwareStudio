import { AUTH_EMAILS, AUTH_ROLES } from "../constants/authConstants";

export default class AuthService {
  static login({ email, password }) {
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    const normalizedPassword = String(password ?? "").trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Correo y contraseña son obligatorios." };
    }

    if (normalizedEmail === AUTH_EMAILS.ADMIN.toLowerCase()) {
      return { ok: true, data: { role: AUTH_ROLES.ADMIN, email: normalizedEmail } };
    }

    if (normalizedEmail === AUTH_EMAILS.USER.toLowerCase()) {
      return { ok: true, data: { role: AUTH_ROLES.USER, email: normalizedEmail } };
    }

    return { ok: false, message: "Credenciales inválidas." };
  }
}
