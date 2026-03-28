import PropTypes from "prop-types";
import { Users, Globe, HardDrive, Activity } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import {
  estadisticasGlobales,
  despliegues,
  planes,
  usuarios,
} from "../../../data/mockData";

function StatCard({ title, value, description, icon }) {
  return (
    <BaseCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </BaseCard>
  );
}

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  description: PropTypes.string,
  icon: PropTypes.node,
};

const estadoPorColor = {
  Activo: "bg-green-50 text-green-700",
  Actualizando: "bg-blue-50 text-blue-700",
  Error: "bg-red-50 text-red-700",
  Suspendido: "bg-gray-100 text-gray-600",
};

const statusData = [
  {
    estado: "Activo",
    cantidad: despliegues.filter((d) => d.estado === "Activo").length,
  },
  {
    estado: "Actualizando",
    cantidad: despliegues.filter((d) => d.estado === "Actualizando").length,
  },
  {
    estado: "Error",
    cantidad: despliegues.filter((d) => d.estado === "Error").length,
  },
];

const distribucionPlanes = planes.map((p) => ({
  nombre: p.nombre,
  cantidad: usuarios.filter((u) => u.plan === p.nombre).length,
}));

export default function AdminDashboard() {
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
          value={estadisticasGlobales.totalUsuarios}
          description={`${usuarios.filter((u) => u.estadoPlan !== "Suspendido").length} activos`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Total despliegues"
          value={estadisticasGlobales.totalDespliegues}
          description={`${despliegues.filter((d) => d.estado === "Activo").length} activos`}
          icon={<Globe className="h-4 w-4" />}
        />
        <StatCard
          title="Almacenamiento usado"
          value={`${estadisticasGlobales.almacenamientoUsadoMB} MB`}
          description="En todos los despliegues"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <StatCard
          title="Tráfico total"
          value={estadisticasGlobales.traficoTotal.toLocaleString("es-MX")}
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
                      {s.estado}
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
