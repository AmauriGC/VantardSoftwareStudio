import { useState, useEffect } from "react";
import { Check, CreditCard, HardDrive, UploadCloud } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseModal from "../../../components/BaseModal";
import BaseInput from "../../../components/BaseInput";
import { showSuccessAlert, showErrorAlert } from "../../../kernel/alerts";
import UserService from "./service/UserService";

export default function UserPlan() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [meses, setMeses] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Obtener perfil
        const resultProfile = await UserService.getProfile();
        if (resultProfile.ok) {
          setProfile(resultProfile.data);
        }

        // Obtener planes disponibles
        const resultPlanes = await UserService.listPlans();
        if (resultPlanes.ok) {
          setPlanes(resultPlanes.data);
        }

        // Obtener solicitudes de cambio de plan
        const resultRequests = await UserService.getPlanRequests();
        if (resultRequests.ok) {
          setMisSolicitudes(resultRequests.data);
        }
      } catch (error) {
        console.error("Error cargando datos de plan:", error);
        showErrorAlert({
          title: "Error",
          text: "No se pudieron cargar los datos del plan",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const abrirModal = (plan) => {
    setPlanSeleccionado(plan);
    setMeses("1");
    setModalAbierto(true);
  };

  const handleSolicitar = async () => {
    if (!planSeleccionado || !meses) return;
    
    setIsSubmitting(true);
    try {
      const result = await UserService.requestPlanChange({
        plan_id: planSeleccionado.id,
        months: parseInt(meses, 10),
      });

      if (result.ok) {
        setModalAbierto(false);
        // Recargar solicitudes
        const resultRequests = await UserService.getPlanRequests();
        if (resultRequests.ok) {
          setMisSolicitudes(resultRequests.data);
        }
        showSuccessAlert({
          title: "Solicitud enviada",
          text: `Tu solicitud para el plan ${planSeleccionado?.name || planSeleccionado?.nombre} fue enviada. El administrador la revisará pronto.`,
        });
      } else {
        showErrorAlert({
          title: "Error",
          text: result.message || "No se pudo enviar la solicitud",
        });
      }
    } catch (error) {
      console.error("Error enviando solicitud:", error);
      showErrorAlert({
        title: "Error",
        text: "No se pudo enviar la solicitud",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalEstimado =
    planSeleccionado && meses
      ? (planSeleccionado.price || planSeleccionado.precio) * Number.parseInt(meses || "1", 10)
      : 0;

  const ESTADO_CLASES = {
    Pendiente: "bg-yellow-50 text-yellow-700",
    Aprobado: "bg-green-50 text-green-700",
    Rechazado: "bg-red-50 text-red-700",
  };

  // Encontrar el plan actual del usuario
  const planActual = planes.find((p) => p.id === profile?.plan_id || p.name === profile?.plan_name) || planes[0];

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Mi plan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cargando tu información...</p>
        </div>
        <BaseCard className="p-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="animate-spin h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-600">Cargando datos del plan...</p>
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mi plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Administra tu suscripción y solicita cambios de plan
        </p>
      </div>

      {/* Plan actual */}
      <BaseCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Plan actual</h2>
            <p className="text-xs text-gray-500">Estado de tu suscripción</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100 mb-5">
          <div>
            <p className="text-lg font-bold text-blue-900">{planActual?.name || planActual?.nombre || "Plan"}</p>
            <p className="text-sm text-blue-700">
              {(planActual?.price || planActual?.precio) === 0
                ? "Gratuito"
                : `$${planActual?.price || planActual?.precio} / mes`}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            {profile?.plan_status || "Activo"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Disco máximo</p>
              <p className="font-medium text-gray-900">{planActual?.max_disk_mb || planActual?.discoMaxMB || 0} MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Carga máxima</p>
              <p className="font-medium text-gray-900">{planActual?.max_upload_mb || planActual?.cargaMaxMB || 0} MB</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <Check className="h-2.5 w-2.5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Plan habilitado</p>
              <p className="font-medium text-gray-900">Sí</p>
            </div>
          </div>
        </div>
      </BaseCard>

      {/* Planes disponibles */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Planes disponibles</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {planes.map((p) => {
            const esActual = p.id === planActual?.id || p.name === planActual?.name;
            return (
              <BaseCard
                key={p.id}
                className={`p-5 flex flex-col gap-4 ${
                  esActual ? "ring-2 ring-blue-600" : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold text-gray-900">{p.name || p.nombre}</h3>
                    {esActual && (
                      <span className="text-[10px] font-medium bg-blue-600 text-white px-1.5 py-0.5 rounded">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {(p.price || p.precio) === 0 ? "Gratis" : `$${p.price || p.precio}/mes`}
                  </p>
                </div>

                <ul className="flex flex-col gap-2 text-sm flex-1">
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    {p.max_disk_mb || p.discoMaxMB} MB de almacenamiento
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Carga hasta {p.max_upload_mb || p.cargaMaxMB} MB
                  </li>
                  <li className="flex items-center gap-2 text-gray-600">
                    <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    Dominio .vss.app incluido
                  </li>
                </ul>

                <BaseButton
                  className="w-full"
                  variant={esActual ? "secondary" : "primary"}
                  disabled={esActual}
                  onClick={() => abrirModal(p)}
                >
                  {esActual ? "Plan actual" : "Solicitar upgrade"}
                </BaseButton>
              </BaseCard>
            );
          })}
        </div>
      </div>

      {/* Historial de solicitudes */}
      {misSolicitudes.length > 0 && (
        <BaseCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900">Mis solicitudes</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Plan solicitado", "Tipo", "Meses", "Total", "Estado", "Fecha"].map((col) => (
                  <th
                    key={col}
                    className={`py-3 px-5 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      col === "Total" || col === "Meses" ? "text-right" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {misSolicitudes.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-5 font-medium text-gray-900">{s.planSolicitado}</td>
                  <td className="py-3 px-5 text-gray-500">{s.tipo}</td>
                  <td className="py-3 px-5 text-right text-gray-500">{s.meses}</td>
                  <td className="py-3 px-5 text-right font-medium text-gray-900">${s.total}</td>
                  <td className="py-3 px-5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ESTADO_CLASES[s.estado] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-400">{s.creadoEn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </BaseCard>
      )}

      {/* Modal solicitar upgrade */}
      <BaseModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={`Solicitar plan ${planSeleccionado?.nombre}`}
        footer={
          <>
            <BaseButton
              variant="secondary"
              onClick={() => setModalAbierto(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </BaseButton>
            <BaseButton onClick={handleSolicitar} isLoading={isSubmitting}>
              Enviar solicitud
            </BaseButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Estás solicitando cambiar al plan{" "}
            <span className="font-semibold text-gray-900">{planSeleccionado?.nombre}</span>
            {planSeleccionado?.precio > 0
              ? ` por $${planSeleccionado?.precio}/mes.`
              : " (gratuito)."}
          </p>
          {planSeleccionado?.precio > 0 && (
            <BaseInput
              id="meses"
              label="Número de meses"
              type="number"
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
            />
          )}
          {planSeleccionado?.precio > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Total estimado</p>
                <p className="text-base font-bold text-gray-900">${totalEstimado}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">
            El administrador revisará tu solicitud y te notificará cuando sea procesada.
          </p>
        </div>
      </BaseModal>
    </div>
  );
}
