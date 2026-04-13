import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

export default class DeploymentService {
  static async listMyDeployments({ page, pageSize, status } = {}) {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.list, {
        params: {
          ...(page ? { page } : {}),
          ...(pageSize ? { page_size: pageSize } : {}),
          ...(status ? { status } : {}),
        },
      });
      const payload = response?.data?.data ?? {};
      return {
        ok: true,
        data: payload.deployments ?? [],
        meta: {
          total: payload.total ?? 0,
          pagina: payload.pagina ?? 1,
          paginas: payload.paginas ?? 1,
        },
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  // Regla backend: crear deployment SIEMPRE requiere ZIP (una sola llamada).
  static async createDeployment({ domain, zipFile }) {
    try {
      const formData = new FormData();
      formData.append("domain", domain);
      formData.append("zip_file", zipFile);

      const response = await axiosClient.post(ENDPOINTS.deployments.list, formData);
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async getDeployment(deploymentId) {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.detail(deploymentId));
      const payload = response?.data?.data ?? {};
      return { ok: true, data: payload };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async getMyLogs({ page, pageSize, q, domain } = {}) {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.myLogs, {
        params: {
          ...(page ? { page } : {}),
          ...(pageSize ? { page_size: pageSize } : {}),
          ...(q ? { q } : {}),
          ...(domain ? { domain } : {}),
        },
      });
      const payload = response?.data?.data ?? {};
      const logs = (payload.logs ?? []).map((item) => ({
        id: item.id,
        domain: item.domain,
        ruta: item.ruta ?? item.path ?? "-",
        metodo: item.metodo ?? item.method ?? "GET",
        ip: item.ip ?? item.client_ip ?? "-",
        codigo: item.codigo ?? item.status_code ?? 200,
        fecha: item.fecha ?? item.created_at ?? null,
      }));
      return {
        ok: true,
        data: logs,
        meta: {
          total: payload.total ?? logs.length,
          pagina: payload.pagina ?? 1,
          paginas: payload.paginas ?? 1,
        },
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async inactivateDeployment(deploymentId) {
    try {
      await axiosClient.delete(ENDPOINTS.deployments.detail(deploymentId));
      return { ok: true };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async getTraffic(days = 7, deploymentId = null) {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.traffic, {
        params: {
          days,
          ...(deploymentId ? { deployment_id: deploymentId } : {}),
        },
      });
      const payload = response?.data?.data ?? {};
      const traffic = (payload.traffic ?? []).map((item) => ({
        date: item.date ?? item.fecha ?? item.day,
        visits: item.visits ?? item.visitas ?? 0,
      }));
      return { ok: true, data: traffic };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
