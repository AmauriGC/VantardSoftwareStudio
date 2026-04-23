import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";

import BaseCard from "../../../components/BaseCard";
import BaseTable from "../../../components/BaseTable";
import HttpBadge from "../../../components/HttpBadge";
import { ENDPOINTS } from "../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../kernel/axiosClient";
import { showErrorAlert } from "../../../kernel/alerts";
import { formatearFecha } from "../../../utils/formatters";
import AdminUserService from "./service/AdminUserService";

function getNombreUsuario(userId, usersMap) {
  if (userId == null) return "Invitado";

  const numericId = Number(userId);
  const keyVariants = [numericId, String(userId)];

  for (const key of keyVariants) {
    if (key in usersMap) {
      return usersMap[key];
    }
  }

  return `ID ${userId}`;
}

export default function AdminLogs() {
  const [busqueda, setBusqueda] = useState("");
  const [logs, setLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10; // page_size fijo en backend para system_logs

  // Carga el mapa de usuarios una sola vez al montar el componente
  useEffect(() => {
    let cancelled = false;

    AdminUserService.listUsers().then((result) => {
      if (cancelled || !result?.ok || !Array.isArray(result.data)) return;
      const map = {};
      for (const user of result.data) {
        const id = user.id;
        if (id == null) continue;
        const baseName = `${user.nombre || ""} ${user.apellido || ""}`.trim();
        map[id] = baseName || user.email || `ID ${id}`;
      }
      setUsersMap(map);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Carga los logs cada vez que cambia la página
  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      setIsLoading(true);
      try {
        const response = await axiosClient.get(ENDPOINTS.systemLogs.list, {
          params: { page },
        });

        if (cancelled) return;

        const payload = response?.data?.data ?? {};
        const rawLogs = Array.isArray(payload.logs) ? payload.logs : [];

        const mappedLogs = rawLogs.map((item) => ({
          id: item.id,
          usuarioId: item.user_id,
          accion: item.action,
          objetivo: item.request_path,
          fecha: item.created_at,
          ipAddress: item.ip_address,
          httpMethod: item.http_method,
          statusCode: item.status_code,
          userAgent: item.user_agent,
        }));

        setLogs(mappedLogs);
        setTotal(Number(payload.total ?? mappedLogs.length) || 0);
      } catch (error) {
        if (cancelled) return;
        const normalized = normalizeAxiosError(error);
        setLogs([]);
        setTotal(0);
        showErrorAlert({
          title: "No se pudieron cargar los registros",
          text: normalized.message,
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [page]);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const response = await axiosClient.get(ENDPOINTS.systemLogs.download, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([response.data], { type: "text/plain" }));
      const link = document.createElement("a");
      const fecha = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `auditoria_${fecha}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      showErrorAlert({
        title: "No se pudo descargar el archivo",
        text: normalized.message,
      });
    } finally {
      setIsDownloading(false);
    }
  }

  const termino = busqueda.trim().toLowerCase();
  const filtrados = logs.filter((a) => {
    if (!termino) return true;

    const nombre = getNombreUsuario(a.usuarioId, usersMap).toLowerCase();
    const accion = String(a.accion || "").toLowerCase();
    const objetivo = String(a.objetivo || "").toLowerCase();
    const ip = String(a.ipAddress || "").toLowerCase();
    const metodo = String(a.httpMethod || "").toLowerCase();
    const codigo = String(a.statusCode ?? "").toLowerCase();
    const agente = String(a.userAgent || "").toLowerCase();

    return (
      nombre.includes(termino) ||
      accion.includes(termino) ||
      objetivo.includes(termino) ||
      ip.includes(termino) ||
      metodo.includes(termino) ||
      codigo.includes(termino) ||
      agente.includes(termino)
    );
  });

  const columns = [
    {
      key: "usuario",
      header: "Usuario",
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {getNombreUsuario(row.usuarioId, usersMap)}
          </div>
          {row.ipAddress && (
            <div className="text-xs text-gray-400 font-mono">{row.ipAddress}</div>
          )}
        </div>
      ),
    },
    {
      key: "accion",
      header: "Acción",
      render: (row) => <span className="text-gray-600">{row.accion}</span>,
    },
    {
      key: "objetivo",
      header: "Objetivo",
      render: (row) => (
        <div>
          <div className="text-gray-700 font-mono text-xs break-all">
            {row.objetivo || "-"}
          </div>
          {row.httpMethod && (
            <div className="text-xs text-gray-400 uppercase">{row.httpMethod}</div>
          )}
        </div>
      ),
    },
    {
      key: "codigo",
      header: "Código",
      align: "center",
      render: (row) =>
        typeof row.statusCode === "number" ? (
          <HttpBadge codigo={row.statusCode} />
        ) : (
          <span className="text-xs text-gray-400">-</span>
        ),
    },
    {
      key: "agente",
      header: "Agente",
      render: (row) => (
        <span
          className="text-xs text-gray-500 max-w-xs truncate inline-block align-top"
          title={row.userAgent || undefined}
        >
          {row.userAgent || "-"}
        </span>
      ),
    },
    {
      key: "fecha",
      header: "Fecha",
      align: "right",
      render: (row) => (
        <span className="text-xs text-gray-400">
          {row.fecha ? formatearFecha(row.fecha) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Registros del sistema</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Historial de actividad de todos los usuarios
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? "Descargando..." : "Descargar .txt"}
        </button>
      </div>

      {/* Tabla de logs */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isLoading ? "Cargando registros..." : `${total} registros`}
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, acción u objetivo..."
              value={busqueda}
              onChange={(e) => {
                setPage(1);
                setBusqueda(e.target.value);
              }}
              className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
            />
          </div>
        </div>
        <BaseTable
          columns={columns}
          rows={filtrados}
          loading={isLoading}
          emptyText="No se encontraron registros."
          pageSize={PAGE_SIZE}
          page={page}
          totalRows={total}
          onPageChange={setPage}
        />
      </BaseCard>
    </div>
  );
}
