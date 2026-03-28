import { Search } from "lucide-react";
import { useState } from "react";

import BaseCard from "../../../components/BaseCard";
import BaseTable from "../../../components/BaseTable";
import HttpBadge from "../../../components/HttpBadge";
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

  const columns = [
    {
      key: "sitio",
      header: "Sitio",
      render: (l) => misDesplieguesMap.get(l.despliegueId) || l.despliegueId,
    },
    { key: "ruta", header: "Ruta" },
    { key: "metodo", header: "Método" },
    { key: "ip", header: "IP" },
    {
      key: "codigo",
      header: "Código",
      render: (l) => <HttpBadge codigo={l.codigo} />,
    },
    {
      key: "fecha",
      header: "Fecha",
      align: "right",
      render: (l) => formatearFecha(l.fecha),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Registros de acceso</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Historial de visitas a tus sitios desplegados
        </p>
      </div>

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
        <BaseTable
          columns={columns}
          rows={filtrados}
          emptyText="No se encontraron registros."
          pageSize={0}
        />
      </BaseCard>
    </div>
  );
}
