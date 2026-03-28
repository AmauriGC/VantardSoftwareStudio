import PropTypes from "prop-types";
import { Rocket, HardDrive, Activity, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import {
  usuarioActual,
  despliegues,
  actividad,
  logsAcceso,
  planes,
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

function getColorBarra(pct) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-yellow-400";
  return "bg-blue-600";
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserDashboard() {
  const navigate = useNavigate();

  const misDespliegues = despliegues.filter((d) => d.usuarioId === usuarioActual.id);
  const miActividad = actividad.filter((a) => a.usuarioId === usuarioActual.id);
  const misLogs = logsAcceso.filter((l) =>
    misDespliegues.some((d) => d.id === l.despliegueId)
  );

  const planActual = planes.find((p) => p.nombre === usuarioActual.plan) || planes[0];
  const discoPercent =
    planActual.discoMaxMB > 0
      ? Math.round((usuarioActual.usoDiscoMB / planActual.discoMaxMB) * 100)
      : 0;
  const traficoTotal = misDespliegues.reduce((acc, d) => acc + d.trafico, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bienvenido de vuelta, {usuarioActual.nombre}
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
          value={usuarioActual.plan}
          description={`Hasta ${planActual.cargaMaxMB} MB por carga`}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <StatCard
          title="Disco usado"
          value={`${usuarioActual.usoDiscoMB} MB`}
          description={`${discoPercent}% de ${planActual.discoMaxMB} MB`}
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
          <span>{usuarioActual.usoDiscoMB} MB usados</span>
          <span>{planActual.discoMaxMB} MB totales</span>
        </div>
        <div className="flex flex-col gap-2">
          {misDespliegues.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate("/user/despliegue")}
                className="text-blue-600 hover:text-blue-700 font-mono text-xs hover:underline"
              >
                {d.dominio}
              </button>
              <span className="text-gray-500">{d.usoDiscoMB} MB</span>
            </div>
          ))}
          {misDespliegues.length === 0 && (
            <p className="text-xs text-gray-400">Sin despliegues aún.</p>
          )}
        </div>
      </BaseCard>

      {/* Actividad reciente y accesos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Actividad */}
        <BaseCard className="p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Actividad reciente</h2>
          <div className="flex flex-col gap-3">
            {miActividad.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{a.accion}</span>{" "}
                    <span className="text-gray-500">{a.objetivo}</span>
                  </p>
                  <p className="text-xs text-gray-400">{formatearFecha(a.fecha)}</p>
                </div>
              </div>
            ))}
            {miActividad.length === 0 && (
              <p className="text-xs text-gray-400">Sin actividad registrada.</p>
            )}
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
                    <td className="py-2.5 px-5 font-mono text-xs text-gray-700">{l.ruta}</td>
                    <td className="py-2.5 px-5 font-mono text-xs text-gray-500">{l.ip}</td>
                    <td className="py-2.5 px-5 text-right text-xs text-gray-400">
                      {formatearFecha(l.fecha)}
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
