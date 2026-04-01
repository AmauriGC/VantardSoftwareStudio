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
      const endpoint = `${ENDPOINTS.deployments.detail(deploymentId)}logs/`;
      const response = await axiosClient.get(endpoint);
      const payload = response?.data?.data ?? {};
      return { ok: true, data: payload.logs ?? [] };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return { ok: false, message: normalized.message };
    }
  }
}
