import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

export default class UserService {
  static async getProfile() {
    try {
      const response = await axiosClient.get(ENDPOINTS.users.profile);
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async updateProfile({ first_name, last_name }) {
    try {
      const response = await axiosClient.put(ENDPOINTS.users.profile, {
        first_name,
        last_name,
      });
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async changePassword({ current_password, new_password, confirm_password }) {
    try {
      await axiosClient.put(ENDPOINTS.users.changePassword, {
        current_password,
        new_password,
        confirm_password,
      });
      return { ok: true };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async deleteAccount() {
    try {
      await axiosClient.delete(ENDPOINTS.users.deleteAccount);
      return { ok: true };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
