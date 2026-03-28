import { Search } from "lucide-react";
import { useState } from "react";

import BaseCard from "../../../components/BaseCard";
import { actividad, usuarios } from "../../../data/mockData";

function getNombreUsuario(userId) {
  const u = usuarios.find((x) => x.id === userId);
  return u ? `${u.nombre} ${u.apellido}` : userId;
}

function formatearFecha(iso) {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminLogs() {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = actividad.filter(
    (a) =>
      getNombreUsuario(a.usuarioId).toLowerCase().includes(busqueda.toLowerCase()) ||
      a.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.objetivo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Registros del sistema</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Historial de actividad de todos los usuarios
        </p>
      </div>

      {/* Tabla de logs */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
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
                {["Usuario", "Acción", "Objetivo", "Fecha"].map((col) => (
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
                  <td colSpan={4} className="py-10 text-center text-sm text-gray-400">
                    No se encontraron registros.
                  </td>
                </tr>
              ) : (
                filtrados.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-5 font-medium text-gray-900">
                      {getNombreUsuario(a.usuarioId)}
                    </td>
                    <td className="py-3 px-5 text-gray-600">{a.accion}</td>
                    <td className="py-3 px-5 text-gray-500 font-mono text-xs">
                      {a.objetivo}
                    </td>
                    <td className="py-3 px-5 text-right text-gray-400 text-xs">
                      {formatearFecha(a.fecha)}
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
