import { Globe, HardDrive, Activity, UploadCloud, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import { usuarioActual, despliegues, logsAcceso } from "../../../data/mockData";

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ESTADO_CLASES = {
  Activo: "bg-green-50 text-green-700",
  Actualizando: "bg-blue-50 text-blue-700",
  Error: "bg-red-50 text-red-700",
  Suspendido: "bg-gray-100 text-gray-600",
};

export default function UserDespliegue() {
  const navigate = useNavigate();

  const miDespliegue = despliegues.find((d) => d.usuarioId === usuarioActual.id);
  const logs = miDespliegue
    ? logsAcceso.filter((l) => l.despliegueId === miDespliegue.id)
    : [];

  if (!miDespliegue) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mi despliegue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de tu sitio web estático</p>
        </div>
        <BaseCard className="p-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="h-12 w-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Sin despliegues</p>
            <p className="text-xs text-gray-500 mt-1">
              Aún no tienes ningún sitio desplegado.
            </p>
          </div>
          <BaseButton onClick={() => navigate("/user/nuevo-despliegue")}>
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Crear despliegue
          </BaseButton>
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mi despliegue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de tu sitio web estático</p>
        </div>
        <BaseButton onClick={() => navigate("/user/nuevo-despliegue")}>
          <UploadCloud className="h-4 w-4 mr-1.5" />
          Actualizar sitio
        </BaseButton>
      </div>

      {/* Info del despliegue */}
      <BaseCard className="p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 font-mono">
                {miDespliegue.dominio}
              </h2>
              <span
                className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  ESTADO_CLASES[miDespliegue.estado] || "bg-gray-100 text-gray-600"
                }`}
              >
                {miDespliegue.estado}
              </span>
            </div>
          </div>
          <a
            href={`https://${miDespliegue.dominio}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visitar sitio
          </a>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 border-t border-gray-200 pt-5">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Disco usado
            </p>
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">
                {miDespliegue.usoDiscoMB} MB
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Tráfico total
            </p>
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">
                {miDespliegue.trafico.toLocaleString("es-MX")} visitas
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Creado
            </p>
            <p className="text-sm font-semibold text-gray-900">{miDespliegue.creadoEn}</p>
          </div>
        </div>
      </BaseCard>

      {/* Registros de acceso */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Registros de acceso</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Ruta", "Método", "IP", "Código", "Fecha"].map((col) => (
                  <th
                    key={col}
                    className={`py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      col === "Fecha" ? "text-right" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-400">
                    Sin registros de acceso aún.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-5 font-mono text-xs text-gray-700">{l.ruta}</td>
                    <td className="py-3 px-5 text-xs text-gray-500">{l.metodo}</td>
                    <td className="py-3 px-5 font-mono text-xs text-gray-500">{l.ip}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium ${
                          l.codigo >= 400
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {l.codigo}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right text-xs text-gray-400">
                      {formatearFecha(l.fecha)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </BaseCard>
    </div>
  );
}
