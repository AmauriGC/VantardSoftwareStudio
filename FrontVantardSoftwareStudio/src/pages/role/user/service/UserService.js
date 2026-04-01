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

  static async listPlans() {
    try {
      const response = await axiosClient.get("/api/plans/");
      return { ok: true, data: response?.data?.data ?? [] };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async getPlanRequests() {
    try {
      const response = await axiosClient.get("/api/plan-requests/");
      return { ok: true, data: response?.data?.data ?? [] };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async requestPlanChange({ plan_id, months }) {
    try {
      const response = await axiosClient.post("/api/plan-requests/", {
        plan_id,
        months,
      });
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
