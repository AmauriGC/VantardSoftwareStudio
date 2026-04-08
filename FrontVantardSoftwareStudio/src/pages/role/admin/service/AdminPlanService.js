import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

export default class AdminPlanService {
  static async listPlans() {
    try {
      // Para admin usamos el listado completo (todos los planes no eliminados)
      const response = await axiosClient.get(ENDPOINTS.plans.adminList);
      const payload = response?.data?.data ?? response?.data ?? {};
      const rawPlans = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.plans)
          ? payload.plans
          : [];

      return { ok: true, data: rawPlans };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async updatePlan(id, payload) {
    try {
      const response = await axiosClient.put(ENDPOINTS.plans.detail(id), payload);
      const data = response?.data?.data ?? response?.data ?? null;
      return { ok: true, data };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
