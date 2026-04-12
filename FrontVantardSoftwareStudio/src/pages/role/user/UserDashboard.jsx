import { Rocket, HardDrive, Activity, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import StatCard from "../../../components/StatCard";
import { formatearFecha } from "../../../utils/formatters";
import { showErrorAlert } from "../../../kernel/alerts";
import UserService from "./service/UserService";
import DeploymentService from "./service/DeploymentService";

function getColorBarra(pct) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-400";
  return "bg-blue-600";
}

export default function UserDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [misLogs, setMisLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      // Obtener perfil del usuario
      const resultProfile = await UserService.getProfile();
      if (resultProfile.ok) {
        setProfile(resultProfile.data);
      } else {
        showErrorAlert({
          title: "Error",
          text: resultProfile.message || "No se pudo cargar tu perfil.",
        });
      }

      // Accesos recientes (una sola llamada paginada)
      const resultLogs = await DeploymentService.getMyLogs({ page: 1, pageSize: 6 });
      if (resultLogs.ok) {
        setMisLogs(resultLogs.data);
      } else {
        showErrorAlert({
          title: "Error",
          text: resultLogs.message || "No se pudieron cargar los accesos recientes.",
        });
      }

      setLoading(false);
    };

    cargarDatos();
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cargando tu información...</p>
        </div>
        <BaseCard className="p-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600">Cargando dashboard...</p>
        </BaseCard>
      </div>
    );
  }

  // Calcular estadísticas
  const discoPercent = profile.plan_max_disk_mb > 0
    ? Math.round((profile.used_disk_mb / profile.plan_max_disk_mb) * 100)
    : 0;
  const traficoTotal = Number(profile.total_traffic_visit_count ?? 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bienvenido de vuelta, {profile.first_name || profile.nombre || "Usuario"}
          </p>
        </div>
        <BaseButton onClick={() => navigate("/user/nuevo-despliegue")}>
          <Rocket className="h-4 w-4 mr-1.5" />
          Nuevo despliegue
        </BaseButton>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Plan actual"
          value={profile.plan_name || profile.plan || "Gratis"}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Disco usado"
          value={`${profile.used_disk_mb || 0} MB`}
          description={`${discoPercent}% de ${profile.plan_max_disk_mb || 0} MB`}
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          title="Tráfico total"
          value={traficoTotal.toLocaleString("es-MX")}
          description="Visitas a mis sitios"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Barra de almacenamiento */}
      <BaseCard className="p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Almacenamiento</h2>
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getColorBarra(discoPercent)}`}
            style={{ width: `${discoPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2 mb-4">
          <span>{profile.used_disk_mb || 0} MB usados</span>
          <span>{profile.plan_max_disk_mb || 0} MB totales</span>
        </div>
        <div className="flex flex-col gap-2">
          {profile.active_site_domain ? (
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate("/user/despliegue")}
                className="text-blue-600 hover:text-blue-700 font-mono text-xs hover:underline"
              >
                {profile.active_site_domain}
              </button>
              <span className="text-gray-500">{profile.active_site_disk_used_mb ?? profile.used_disk_mb ?? 0} MB</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin despliegue activo aún.</p>
          )}
        </div>
      </BaseCard>

      {/* Actividad reciente y accesos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Actividad */}
        <BaseCard className="p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Actividad reciente</h2>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400">Actividad de despliegues</p>
          </div>
        </BaseCard>

        {/* Accesos recientes */}
        <BaseCard className="overflow-hidden">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Accesos recientes</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-b border-gray-100">
                <th className="py-2 px-5 text-left text-xs font-medium text-gray-500">Ruta</th>
                <th className="py-2 px-5 text-left text-xs font-medium text-gray-500">IP</th>
                <th className="py-2 px-5 text-right text-xs font-medium text-gray-500">Hora</th>
              </tr>
            </thead>
            <tbody>
              {misLogs.slice(0, 6).length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-gray-400">
                    Sin registros de acceso.
                  </td>
                </tr>
              ) : (
                misLogs.slice(0, 6).map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-5 font-mono text-xs text-gray-700">{l.ruta || l.path}</td>
                    <td className="py-2.5 px-5 font-mono text-xs text-gray-500">{l.ip || l.client_ip}</td>
                    <td className="py-2.5 px-5 text-right text-xs text-gray-400">
                      {formatearFecha(l.fecha || l.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </BaseCard>
      </div>
    </div>
  );
}
