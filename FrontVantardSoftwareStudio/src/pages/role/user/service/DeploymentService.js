import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

export default class DeploymentService {
  static async listMyDeployments() {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.list);
      const payload = response?.data?.data ?? {};
      return { ok: true, data: payload.deployments ?? [] };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async createDeployment({ domain }) {
    try {
      const response = await axiosClient.post(ENDPOINTS.deployments.list, { domain });
      return { ok: true, data: response?.data?.data ?? null };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async uploadVersion({ deploymentId, zipFile }) {
    try {
      const formData = new FormData();
      formData.append("zip_file", zipFile);

      const response = await axiosClient.post(
        ENDPOINTS.deploymentVersions.upload(deploymentId),
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

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

  static async getVersions(deploymentId) {
    try {
      const response = await axiosClient.get(ENDPOINTS.deploymentVersions.list(deploymentId));
      const payload = response?.data?.data ?? {};
      return { ok: true, data: payload.versions ?? [] };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }

  static async getLogs(deploymentId) {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.logs(deploymentId));
      const payload = response?.data?.data ?? {};
      const logs = (payload.logs ?? []).map((item) => ({
        id: item.id,
        deployment_id: item.deployment_id ?? deploymentId,
        ruta: item.ruta ?? item.path ?? "-",
        metodo: item.metodo ?? item.method ?? "GET",
        ip: item.ip ?? item.client_ip ?? "-",
        codigo: item.codigo ?? item.status_code ?? 200,
        fecha: item.fecha ?? item.created_at ?? null,
      }));
      return { ok: true, data: logs };
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

  static async getTrafficSummary() {
    try {
      const response = await axiosClient.get(ENDPOINTS.deployments.trafficSummary);
      const payload = response?.data?.data ?? {};
      return { ok: true, data: payload };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
