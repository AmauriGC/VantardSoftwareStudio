import { ENDPOINTS } from "../../../constants/endpoints";
import { normalizeAxiosError, axiosClient } from "../../../kernel/axiosClient";
import { AUTH_EMAILS, AUTH_ROLES } from "../constants/authConstants";

function normalizeRole(roleName, email) {
  const normalizedRoleName = String(roleName ?? "").trim().toLowerCase();
  if (normalizedRoleName === "admin") return AUTH_ROLES.ADMIN;
  if (normalizedRoleName === "user") return AUTH_ROLES.USER;

  if (String(email ?? "").trim().toLowerCase() === AUTH_EMAILS.ADMIN.toLowerCase()) {
    return AUTH_ROLES.ADMIN;
  }

  return AUTH_ROLES.USER;
}

export default class AuthService {
  static async register({ fullName, email, password }) {
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    const normalizedPassword = String(password ?? "").trim();
    const normalizedFullName = String(fullName ?? "").trim();

    if (!normalizedFullName || !normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Nombre completo, correo y contraseña son obligatorios." };
    }

    const parts = normalizedFullName.split(/\s+/).filter(Boolean);
    const firstName = parts.shift() ?? "";
    const lastName = parts.join(" ") || firstName;

    try {
      const response = await axiosClient.post(ENDPOINTS.auth.register, {
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        password,
      });

      const payload = response?.data?.data ?? {};
      const user = payload?.user ?? {};
      const role = normalizeRole(user?.role_name, user?.email ?? normalizedEmail);

      return {
        ok: true,
        data: {
          role,
          email: user?.email ?? normalizedEmail,
          user,
          accessToken: payload?.access_token ?? null,
          refreshToken: payload?.refresh_token ?? null,
        },
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async login({ email, password }) {
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    const normalizedPassword = String(password ?? "").trim();

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Correo y contraseña son obligatorios." };
    }

    try {
      const response = await axiosClient.post(ENDPOINTS.auth.login, {
        email: normalizedEmail,
        password,
      });

      const payload = response?.data?.data ?? {};
      const user = payload?.user ?? {};
      const role = normalizeRole(user?.role_name, user?.email ?? normalizedEmail);

      return {
        ok: true,
        data: {
          role,
          email: user?.email ?? normalizedEmail,
          user,
          accessToken: payload?.access_token ?? null,
          refreshToken: payload?.refresh_token ?? null,
        },
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async refresh(refreshToken) {
    if (!refreshToken) {
      return { ok: false, message: "No hay refresh token disponible." };
    }

    try {
      const response = await axiosClient.post(ENDPOINTS.auth.refresh, {
        refresh: refreshToken,
      });
      const payload = response?.data?.data ?? {};
      return {
        ok: true,
        data: {
          accessToken: payload?.access_token ?? null,
          refreshToken: payload?.refresh_token ?? refreshToken,
        },
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async logout(refreshToken) {
    if (!refreshToken) {
      return { ok: true };
    }

    try {
      await axiosClient.post(ENDPOINTS.auth.logout, {
        refresh: refreshToken,
      });
      return { ok: true };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
