import { Users, Globe, HardDrive, Activity } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import BaseCard from "../../../components/BaseCard";
import StatCard from "../../../components/StatCard";

import { showErrorAlert } from "../../../kernel/alerts";
import AdminDashboardService from "./service/AdminDashboardService";

const estadoPorColor = {
  active: "bg-green-50 text-green-700",
  replaced: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-700",
  blocked: "bg-gray-100 text-gray-600",
  inactive: "bg-gray-100 text-gray-600",
};

function getEstadoLabel(estado) {
  switch (estado) {
    case "active":
      return "Activo";
    case "replaced":
      return "Reemplazado";
    case "failed":
      return "Fallido";
    case "blocked":
      return "Bloqueado";
    case "inactive":
      return "Inactivo";
    default:
      return estado;
  }
}

export default function AdminDashboard() {
  const [data, setData] = useState({
    totalUsuarios: 0,
    usuariosActivos: 0,
    totalDespliegues: 0,
    desplieguesActivos: 0,
    almacenamientoUsadoMB: 0,
    traficoTotal: 0,
    distribucionPlanes: [],
    statusData: [],
  });

  useEffect(() => {
    const cargar = async () => {
      const result = await AdminDashboardService.getDashboard();
      if (result.ok) {
        setData(result.data);
      } else {
        showErrorAlert({
          title: "Error",
          text: result.message || "No se pudo cargar el dashboard.",
        });
      }
    };

    cargar();
  }, []);

  const distribucionPlanes = useMemo(() => {
    return Array.isArray(data.distribucionPlanes) ? data.distribucionPlanes : [];
  }, [data.distribucionPlanes]);

  const statusData = useMemo(() => {
    return Array.isArray(data.statusData) ? data.statusData : [];
  }, [data.statusData]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Panel general</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Estadísticas y monitoreo de la plataforma
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total usuarios"
          value={data.totalUsuarios}
          description={`${data.usuariosActivos} activos`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Total despliegues"
          value={data.totalDespliegues}
          description={`${data.desplieguesActivos} activos`}
          icon={<Globe className="h-4 w-4" />}
        />
        <StatCard
          title="Almacenamiento usado"
          value={`${data.almacenamientoUsadoMB} MB`}
          description="En todos los despliegues"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          title="Tráfico total"
          value={Number(data.traficoTotal || 0).toLocaleString("es-MX")}
          description="Visitas totales"
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Tablas de resumen */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Distribución de planes */}
        <BaseCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">
              Distribución de planes
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-right py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuarios
                </th>
              </tr>
            </thead>
            <tbody>
              {distribucionPlanes.map((p) => (
                <tr
                  key={p.nombre}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-5 font-medium text-gray-900">
                    {p.nombre}
                  </td>
                  <td className="py-3 px-5 text-right text-gray-500">
                    {p.cantidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BaseCard>

        {/* Estado de despliegues */}
        <BaseCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">
              Estado de despliegues
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-right py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
              </tr>
            </thead>
            <tbody>
              {statusData.map((s) => (
                <tr
                  key={s.estado}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        estadoPorColor[s.estado] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {getEstadoLabel(s.estado)}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-medium text-gray-900">
                    {s.cantidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </BaseCard>
      </div>
    </div>
  );
}
