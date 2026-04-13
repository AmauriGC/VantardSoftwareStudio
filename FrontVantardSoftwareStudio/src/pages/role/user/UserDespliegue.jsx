import { Globe, HardDrive, Activity, UploadCloud, ExternalLink, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseTable from "../../../components/BaseTable";
import { formatearFecha } from "../../../utils/formatters";
import { showErrorAlert, showSuccessAlert, confirmAction } from "../../../kernel/alerts";
import DeploymentService from "./service/DeploymentService";

const deploymentColumns = [
  {
    key: "actual",
    header: "Actual",
    render: (d) => (d.esActual ? "Sí" : "—"),
  },
  {
    key: "dominio",
    header: "Dominio",
    render: (d) => <span className="font-mono text-xs text-gray-800">{d.dominio}</span>,
  },
  {
    key: "estado",
    header: "Estado",
    render: (d) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          ESTADO_CLASES[d.estado] || "bg-gray-100 text-gray-600"
        }`}
      >
        {d.estado}
      </span>
    ),
  },
  {
    key: "disco",
    header: "Disco",
    align: "right",
    render: (d) => `${d.discoMb} MB`,
  },
  {
    key: "trafico",
    header: "Tráfico",
    align: "right",
    render: (d) => `${Number(d.trafico).toLocaleString("es-MX")} visitas`,
  },
  {
    key: "creado",
    header: "Creado",
    align: "right",
    render: (d) => formatearFecha(d.creadoEn),
  },
  {
    key: "visitar",
    header: "Sitio",
    align: "right",
    render: (d) => (
      <a
        href={d.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Visitar
      </a>
    ),
  },
];

const ESTADO_CLASES = {
  Activo: "bg-green-50 text-green-700",
  Actualizando: "bg-blue-50 text-blue-700",
  Error: "bg-red-50 text-red-700",
  Fallido: "bg-red-50 text-red-700",
  Bloqueado: "bg-gray-100 text-gray-600",
  Inactivo: "bg-gray-100 text-gray-600",
  Reemplazado: "bg-gray-100 text-gray-600",
  Suspendido: "bg-gray-100 text-gray-600",
};

export default function UserDespliegue() {
  const navigate = useNavigate();
  const [miDespliegue, setMiDespliegue] = useState(null);
  const [misDespliegues, setMisDespliegues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const TABLE_PAGE_SIZE = 10;
  const [inactivando, setInactivando] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const cargarPagina = async () => {
      try {
        const resultDeploy = await DeploymentService.listMyDeployments({ page: tablePage });
        if (cancelled) return;

        if (!resultDeploy.ok) {
          showErrorAlert({
            title: "Error",
            text: resultDeploy.message || "No se pudieron cargar tus despliegues.",
          });

          setMisDespliegues([]);
          setTableTotal(0);
          if (tablePage === 1) setMiDespliegue(null);
          return;
        }

        setMisDespliegues(resultDeploy.data);
        setTableTotal(resultDeploy.meta?.total ?? resultDeploy.data.length);

        // La página 1 resuelve el despliegue actual (activo) y la primera página de la tabla.
        if (tablePage !== 1) return;

        if (resultDeploy.data.length === 0) {
          setMiDespliegue(null);
          return;
        }

        const activo = resultDeploy.data.find(
          (d) => String(d.status ?? d.estado ?? "").toLowerCase() === "active"
        );
        const actual = activo ?? resultDeploy.data[0];

        const resultDetail = await DeploymentService.getDeployment(actual.id);
        if (cancelled) return;

        if (resultDetail.ok) {
          setMiDespliegue(resultDetail.data);
        } else {
          showErrorAlert({
            title: "Error",
            text: resultDetail.message || "No se pudo cargar el detalle del despliegue.",
          });
        }
      } catch {
        if (cancelled) return;
        showErrorAlert({
          title: "Error",
          text: "No se pudieron cargar tus despliegues.",
        });
        setMisDespliegues([]);
        setTableTotal(0);
        if (tablePage === 1) setMiDespliegue(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    cargarPagina();

    return () => {
      cancelled = true;
    };
  }, [tablePage]);

  const handleInactivar = async () => {
    if (!miDespliegue) return;
    const confirmed = await confirmAction({
      title: "¿Inactivar el sitio?",
      text: "El sitio dejará de estar disponible públicamente. Podrás volver a activarlo subiendo una nueva versión.",
      confirmText: "Inactivar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    setInactivando(true);
    const result = await DeploymentService.inactivateDeployment(miDespliegue.id);
    setInactivando(false);

    if (!result.ok) {
      showErrorAlert({ title: "Error", text: result.message || "No se pudo inactivar el despliegue." });
      return;
    }

    await showSuccessAlert({ title: "Sitio inactivado", text: "Tu sitio ya no está disponible públicamente." });
    setTablePage(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mi despliegue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de tu sitio web estático</p>
        </div>
        <BaseCard className="p-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600">Cargando despliegue...</p>
        </BaseCard>
      </div>
    );
  }

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

  const domain = miDespliegue.domain ?? miDespliegue.dominio ?? "-";
  const statusRaw = miDespliegue.status ?? miDespliegue.estado ?? "active";
  const statusLabelMap = {
    active: "Activo",
    blocked: "Bloqueado",
    inactive: "Inactivo",
    replaced: "Reemplazado",
    failed: "Fallido",
    updating: "Actualizando",
    error: "Error",
  };
  const statusLabel = statusLabelMap[String(statusRaw).toLowerCase()] ?? statusRaw;
  const diskUsedMb =
    miDespliegue.disk_used_mb ?? miDespliegue.used_disk_mb ?? miDespliegue.usoDiscoMB ?? 0;
  const trafficCount = miDespliegue.traffic_visit_count ?? miDespliegue.trafico ?? 0;
  const createdAt = miDespliegue.created_at ?? miDespliegue.creadoEn ?? "-";
  const siteUrl =
    miDespliegue.site_url ??
    miDespliegue.siteUrl ??
    (String(domain).includes(".") ? `https://${domain}` : `https://${domain}.vss.app`);

  const normalizedDeployments = (Array.isArray(misDespliegues) ? misDespliegues : []).map((d) => {
    const dDomain = d.domain ?? d.dominio ?? "-";
    const dStatusRaw = d.status ?? d.estado ?? "inactive";
    const dStatusLabel = statusLabelMap[String(dStatusRaw).toLowerCase()] ?? dStatusRaw;
    const dSiteUrl =
      d.site_url ??
      d.siteUrl ??
      (String(dDomain).includes(".") ? `https://${dDomain}` : `https://${dDomain}.vss.app`);

    return {
      id: d.id,
      esActual: Number(d.id) === Number(miDespliegue.id),
      dominio: dDomain,
      estado: dStatusLabel,
      discoMb: d.disk_used_mb ?? d.used_disk_mb ?? d.usoDiscoMB ?? 0,
      trafico: d.traffic_visit_count ?? d.trafico ?? 0,
      creadoEn: d.created_at ?? d.creadoEn ?? "-",
      siteUrl: dSiteUrl,
    };
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mi despliegue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de tu sitio web estático</p>
        </div>
        <div className="flex items-center gap-2">
          {String(statusRaw).toLowerCase() === "active" && (
            <BaseButton
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              onClick={handleInactivar}
              isLoading={inactivando}
            >
              <EyeOff className="h-4 w-4 mr-1.5" />
              Inactivar sitio
            </BaseButton>
          )}
          <BaseButton onClick={() => navigate("/user/nuevo-despliegue")}>
            <UploadCloud className="h-4 w-4 mr-1.5" />
            Actualizar sitio
          </BaseButton>
        </div>
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
                {domain}
              </h2>
              <span
                className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  ESTADO_CLASES[statusLabel] || "bg-gray-100 text-gray-600"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <a
            href={siteUrl}
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
                {diskUsedMb} MB
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
                {Number(trafficCount).toLocaleString("es-MX")} visitas
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Creado
            </p>
            <p className="text-sm font-semibold text-gray-900">{formatearFecha(createdAt)}</p>
          </div>
        </div>
      </BaseCard>

      {/* Mis despliegues */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Mis despliegues</h2>
        </div>
        <BaseTable
          columns={deploymentColumns}
          rows={normalizedDeployments}
          emptyText="Sin despliegues aún."
          pageSize={TABLE_PAGE_SIZE}
          page={tablePage}
          totalRows={tableTotal}
          onPageChange={(nextPage) => setTablePage(nextPage)}
        />
      </BaseCard>
    </div>
  );
}
