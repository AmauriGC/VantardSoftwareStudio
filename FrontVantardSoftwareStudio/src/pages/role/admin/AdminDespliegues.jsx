import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Search, Pause, Eye } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseTable from "../../../components/BaseTable";
import BaseButton from "../../../components/BaseButton";
import BaseModal from "../../../components/BaseModal";
import { ENDPOINTS } from "../../../constants/endpoints";
import { axiosClient, normalizeAxiosError } from "../../../kernel/axiosClient";
import { confirmAction, showErrorAlert, showInfoAlert, showSuccessAlert } from "../../../kernel/alerts";

const STATUS_META = {
  active: { label: "Activo", className: "bg-green-50 text-green-700" },
  replaced: { label: "Reemplazado", className: "bg-gray-100 text-gray-600" },
  blocked: { label: "Bloqueado", className: "bg-yellow-50 text-yellow-700" },
  inactive: { label: "Inactivo", className: "bg-gray-100 text-gray-600" },
  failed: { label: "Fallido", className: "bg-red-50 text-red-700" },
};

function EstadoBadge({ estado }) {
  const key = String(estado || "").toLowerCase();
  const meta = STATUS_META[key] ?? {
    label: estado || "-",
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

EstadoBadge.propTypes = { estado: PropTypes.string.isRequired };

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDespliegues() {
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // "ver"
  const [seleccionado, setSeleccionado] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocking, setIsBlocking] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setIsLoading(true);
      try {
        const q = busqueda.trim();
        const response = await axiosClient.get(ENDPOINTS.deployments.adminList, {
          params: {
            page,
            page_size: pageSize,
            ...(q ? { q } : {}),
          },
        });
        const payload = response?.data?.data ?? {};
        if (!cancelled) {
          setDeployments(payload.deployments ?? []);
          setTotalRows(Number(payload.total ?? 0) || 0);
        }
      } catch (error) {
        const normalized = normalizeAxiosError(error);
        if (!cancelled) {
          setDeployments([]);
          setTotalRows(0);
          showErrorAlert({
            title: "No se pudo cargar",
            text: normalized.message,
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [busqueda, page]);

  const abrirModal = (tipo, despliegue) => {
    setModal(tipo);
    setSeleccionado(despliegue);
  };

  const cerrarModal = () => {
    setModal(null);
    setSeleccionado(null);
  };

  const handleBloquear = async (despliegue) => {
    if (!despliegue) return;
    if (String(despliegue.status).toLowerCase() !== "active") {
      showInfoAlert({
        title: "Acción no disponible",
        text: "Solo puedes bloquear un despliegue cuando está activo.",
      });
      return;
    }

    const ok = await confirmAction({
      title: "Bloquear despliegue",
      text: `¿Quieres bloquear "${despliegue?.domain}"?`,
      confirmText: "Bloquear",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    setIsBlocking(true);
    try {
      const response = await axiosClient.put(
        ENDPOINTS.deployments.adminUpdateStatus(despliegue.id),
        { status: "blocked" }
      );
      const updated = response?.data?.data ?? null;

      setDeployments((prev) =>
        prev.map((item) => {
          if (item.id !== despliegue.id) return item;
          if (updated) return { ...item, ...updated };
          return { ...item };
        })
      );
      if (seleccionado?.id === despliegue.id) {
        setSeleccionado((prev) => {
          if (!prev) return prev;
          if (updated) return { ...prev, ...updated };
          return { ...prev };
        });
      }
      showSuccessAlert({
        title: "Despliegue bloqueado",
        text: "El despliegue fue bloqueado correctamente.",
      });
    } catch (error) {
      const normalized = normalizeAxiosError(error);
      showErrorAlert({ title: "No se pudo bloquear", text: normalized.message });
    } finally {
      setIsBlocking(false);
    }
  };

  const columns = [
    {
      key: "domain",
      header: "Dominio",
      render: (d) => <span className="font-mono text-gray-900 text-xs">{d.domain}</span>,
    },
    {
      key: "user",
      header: "Usuario",
      render: (d) => <span className="text-gray-500">{d.user_name || d.user_email || "-"}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (d) => <EstadoBadge estado={d.status || "-"} />,
    },
    {
      key: "disk_used_mb",
      header: "Disco (MB)",
      render: (d) => <span className="text-gray-500">{d.disk_used_mb ?? 0}</span>,
    },
    {
      key: "traffic_visit_count",
      header: "Tráfico",
      render: (d) => (
        <span className="text-gray-500">
          {Number(d.traffic_visit_count ?? 0).toLocaleString("es-MX")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      align: "right",
      render: (d) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => abrirModal("ver", d)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Ver detalle"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleBloquear(d)}
            disabled={isBlocking}
            className="p-1.5 rounded-md text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Bloquear"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Despliegues</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gestión de todos los despliegues de la plataforma
        </p>
      </div>

      {/* Tabla */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Todos los despliegues
          </h2>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por dominio o usuario..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
            />
          </div>
        </div>
        <BaseTable
          columns={columns}
          rows={deployments}
          loading={isLoading}
          emptyText="No se encontraron despliegues."
          pageSize={pageSize}
          page={page}
          totalRows={totalRows}
          onPageChange={setPage}
        />
      </BaseCard>

      {/* Modal ver detalle */}
      <BaseModal
        open={modal === "ver"}
        onClose={cerrarModal}
        title="Detalle del despliegue"
        footer={
          <BaseButton variant="secondary" onClick={cerrarModal}>
            Cerrar
          </BaseButton>
        }
      >
        {seleccionado && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Dominio</p>
                <p className="font-mono font-medium text-gray-900">{seleccionado.domain}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Estado</p>
                <EstadoBadge estado={seleccionado.status || "-"} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Usuario</p>
                <p className="font-medium text-gray-900">
                  {seleccionado.user_name || "-"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Disco usado</p>
                <p className="font-medium text-gray-900">{seleccionado.disk_used_mb ?? 0} MB</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tráfico</p>
                <p className="font-medium text-gray-900">
                  {Number(seleccionado.traffic_visit_count ?? 0).toLocaleString("es-MX")} visitas
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Email</p>
                <p className="font-medium text-gray-900">{seleccionado.user_email || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">URL</p>
                <p className="font-medium text-gray-900 break-all">{seleccionado.site_url || "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Creado</p>
                <p className="font-medium text-gray-900">{formatDateTime(seleccionado.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Actualizado</p>
                <p className="font-medium text-gray-900">{formatDateTime(seleccionado.updated_at)}</p>
              </div>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}
