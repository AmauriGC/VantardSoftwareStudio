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
      const response = await axiosClient.get(ENDPOINTS.plans.list);
      const payload = response?.data?.data ?? response?.data ?? [];
      const plans = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.plans)
          ? payload.plans
          : [];
      return { ok: true, data: plans };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async getPlanRequests() {
    try {
      const response = await axiosClient.get(ENDPOINTS.planChangeRequests.mine);
      const payload = response?.data?.data ?? response?.data ?? [];
      const rawRequests = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.solicitudes)
          ? payload.solicitudes
          : Array.isArray(payload?.requests)
            ? payload.requests
            : Array.isArray(payload?.plan_requests)
              ? payload.plan_requests
              : [];

      const statusMap = {
        pending: "Pendiente",
        approved: "Aprobado",
        rejected: "Rechazado",
        completed: "Aplicada",
        cancelled: "Cancelada",
      };

      const requests = rawRequests.map((item) => ({
        id: item.id,
        planSolicitado: item.requested_plan_name ?? item.planSolicitado ?? "-",
        tipo: "Upgrade",
        meses: item.months ?? item.meses ?? 1,
        total: item.total_price ?? item.total ?? 0,
        estado: statusMap[item.status] ?? item.estado ?? "Pendiente",
        creadoEn: item.created_at ?? item.creadoEn ?? "-",
      }));

      return { ok: true, data: requests };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async requestPlanChange({ plan_id, months }) {
    try {
      const response = await axiosClient.post(ENDPOINTS.planChangeRequests.list, {
        requested_plan_id: plan_id,
        months,
        reason: months ? `Solicitud por ${months} mes(es)` : "Solicitud de cambio de plan",
      });
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async cancelPlanRequest(id) {
    try {
      await axiosClient.delete(ENDPOINTS.planChangeRequests.cancel(id));
      return { ok: true };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async applyPlanRequest(id) {
    try {
      const response = await axiosClient.post(ENDPOINTS.planChangeRequests.apply(id));
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
