import { Search } from "lucide-react";
import { useState } from "react";

import BaseCard from "../../../components/BaseCard";
import { formatearFecha } from "../../../utils/formatters";
import { logsAcceso, despliegues, usuarioActual } from "../../../data/mockData";

export default function UserLogs() {
  const [busqueda, setBusqueda] = useState("");

  const misDespliegues = despliegues.filter((d) => d.usuarioId === usuarioActual.id);
  const misDesplieguesMap = new Map(misDespliegues.map((d) => [d.id, d.dominio]));

  const misLogs = logsAcceso.filter((l) =>
    misDespliegues.some((d) => d.id === l.despliegueId)
  );

  const filtrados = misLogs.filter(
    (l) =>
      l.ruta.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.ip.includes(busqueda) ||
      (misDesplieguesMap.get(l.despliegueId) || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Registros de acceso</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Historial de visitas a tus sitios desplegados
        </p>
      </div>

      {/* Tabla de logs */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Accesos registrados</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtrados.length} registros</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ruta o IP..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Sitio", "Ruta", "Método", "IP", "Código", "Fecha"].map((col) => (
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
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                filtrados.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-5 font-mono text-xs text-gray-700">
                      {misDesplieguesMap.get(l.despliegueId) || l.despliegueId}
                    </td>
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
