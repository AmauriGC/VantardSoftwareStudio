import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

export default class AdminPlanChangeRequestService {
  static async listAll() {
    try {
      const response = await axiosClient.get(ENDPOINTS.planChangeRequests.adminList);
      const payload = response?.data?.data ?? response?.data ?? {};
      const rawRequests = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.solicitudes)
          ? payload.solicitudes
          : [];

      return { ok: true, data: rawRequests };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async approve(id) {
    try {
      const response = await axiosClient.patch(ENDPOINTS.planChangeRequests.adminApprove(id));
      const data = response?.data?.data ?? response?.data ?? null;
      return { ok: true, data };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async reject(id) {
    try {
      const response = await axiosClient.patch(ENDPOINTS.planChangeRequests.adminReject(id));
      const data = response?.data?.data ?? response?.data ?? null;
      return { ok: true, data };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
