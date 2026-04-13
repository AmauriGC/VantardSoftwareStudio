import { ENDPOINTS } from "../../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../../kernel/axiosClient";

const mapUserStatusToLabel = (status) => {
  switch (status) {
    case "active":
      return "Activo";
    case "blocked":
      return "Suspendido";
    default:
      return "Desconocido";
  }
};

const AdminUserService = {
  async listUsers() {
    try {
      const response = await axiosClient.get(ENDPOINTS.users.list);

      const payload = response?.data?.data ?? response?.data ?? {};

      let rawUsers = [];
      if (Array.isArray(payload)) {
        rawUsers = payload;
      } else if (Array.isArray(payload?.users)) {
        rawUsers = payload.users;
      }

      const usuarios = rawUsers.map((item) => {
        const roleName = (item.role_name || "").trim().toLowerCase();
        const isAdmin = roleName === "admin";

        const rawStatus = item.status || "active";
        const estadoUsuario = mapUserStatusToLabel(rawStatus);

        if (isAdmin) {
          return {
            id: item.id,
            nombre: item.first_name || "",
            apellido: item.last_name || "",
            email: item.email || "",
            rol: item.role_name || "-",
            estadoCuenta: estadoUsuario,
            status: rawStatus,
            plan: "-",
            totalDespliegues: "-",
            usoDiscoMB: "-",
            creadoEn: item.created_at || "",
          };
        }

        return {
          id: item.id,
          nombre: item.first_name || "",
          apellido: item.last_name || "",
          email: item.email || "",
          rol: item.role_name || "-",
          estadoCuenta: estadoUsuario,
          status: rawStatus,
          plan: item.plan_name || "Sin plan",
          totalDespliegues:
            typeof item.total_deployments === "number" ? item.total_deployments : 0,
          usoDiscoMB: typeof item.used_disk_mb === "number" ? item.used_disk_mb : 0,
          creadoEn: item.created_at || "",
        };
      });

      return {
        ok: true,
        data: usuarios,
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return {
        ok: false,
        message: normalized.message,
      };
    }
  },
  async createUser({ nombre, apellido, email, password, confirmPassword }) {
    try {
      const payload = {
        first_name: (nombre || "").trim(),
        last_name: (apellido || "").trim(),
        email: (email || "").trim().toLowerCase(),
        password: password || "",
        confirm_password: confirmPassword || "",
      };

      await axiosClient.post(ENDPOINTS.users.adminCreate, payload);

      return {
        ok: true,
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return {
        ok: false,
        message: normalized.message,
      };
    }
  },
  async updateUser(id, { nombre, apellido, email }) {
    try {
      const payload = {
        first_name: (nombre || "").trim(),
        last_name: (apellido || "").trim(),
        email: (email || "").trim().toLowerCase(),
      };

      await axiosClient.patch(ENDPOINTS.users.adminUpdate(id), payload);

      return {
        ok: true,
      };
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      return {
        ok: false,
        message: normalized.message,
      };
    }
  },
  async updateStatus(id, status) {
    try {
      const payload = { status: status || "active" };

      await axiosClient.patch(ENDPOINTS.users.updateStatus(id), payload);

      return {
        ok: true,
        data: {
          status: payload.status,
          label: mapUserStatusToLabel(payload.status),
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

export default AdminUserService;
