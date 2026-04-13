import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

const AdminDashboardService = {
  async getDashboard() {
    try {
      const response = await axiosClient.get(ENDPOINTS.dashboard.admin);
      const payload = response?.data?.data ?? response?.data ?? {};

      return {
        ok: true,
        data: {
          totalUsuarios: Number(payload.totalUsuarios ?? 0),
          usuariosActivos: Number(payload.usuariosActivos ?? 0),
          totalDespliegues: Number(payload.totalDespliegues ?? 0),
          desplieguesActivos: Number(payload.desplieguesActivos ?? 0),
          almacenamientoUsadoMB: Number(payload.almacenamientoUsadoMB ?? 0),
          traficoTotal: Number(payload.traficoTotal ?? 0),
          distribucionPlanes: Array.isArray(payload.distribucionPlanes)
            ? payload.distribucionPlanes
            : [],
          statusData: Array.isArray(payload.statusData) ? payload.statusData : [],
        },
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return {
        ok: false,
        message: normalized.message,
      };
    }
  },
};

export default AdminDashboardService;
