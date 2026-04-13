import { ENDPOINTS } from "../../../constants/endpoints";
import { normalizeAxiosError, axiosClient } from "../../../kernel/axiosClient";
import { AUTH_EMAILS, AUTH_ROLES } from "../constants/authConstants";
import { encryptPayload, decryptPayload } from "../../../kernel/crypto";

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

  static async requestPasswordReset({ email }) {
    const normalizedEmail = String(email ?? "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      return { ok: false, message: "El correo es obligatorio." };
    }

    try {
      const response = await axiosClient.post(ENDPOINTS.auth.passwordResetRequest, {
        email: normalizedEmail,
      });
      return {
        ok: true,
        message:
          response?.data?.message ??
          "Si el correo existe, se enviará un enlace para restablecer la contraseña.",
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async confirmPasswordReset({ uid, token, newPassword, confirmPassword }) {
    const normalizedUid = String(uid ?? "").trim();
    const normalizedToken = String(token ?? "").trim();
    const normalizedNewPassword = String(newPassword ?? "").trim();
    const normalizedConfirmPassword = String(confirmPassword ?? "").trim();

    if (!normalizedUid || !normalizedToken) {
      return { ok: false, message: "El enlace de recuperación es inválido." };
    }

    if (!normalizedNewPassword || !normalizedConfirmPassword) {
      return { ok: false, message: "Debes capturar y confirmar la nueva contraseña." };
    }

    try {
      const ciphertext = await encryptPayload({
        uid:              normalizedUid,
        token:            normalizedToken,
        new_password:     normalizedNewPassword,
        confirm_password: normalizedConfirmPassword,
      });

      const response = await axiosClient.post(ENDPOINTS.auth.passwordResetConfirm, {
        ciphertext,
      });

      const decrypted = await decryptPayload(response?.data?.ciphertext);
      return {
        ok: true,
        message: decrypted?.message ?? "Contraseña restablecida correctamente.",
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
