import { useState, useEffect } from "react";
import { Save, RefreshCcw } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import { planes as planesMock, usuarios } from "../../../data/mockData";
import { showSuccessAlert, showErrorAlert } from "../../../kernel/alerts";
import AdminPlanService from "./service/AdminPlanService";
import AdminPlanChangeRequestService from "./service/AdminPlanChangeRequestService";

const ESTADO_SOLICITUD_CLASES = {
  Pendiente: "bg-yellow-50 text-yellow-700",
  Aprobado: "bg-green-50 text-green-700",
  Rechazado: "bg-red-50 text-red-700",
};

function getNombreUsuario(userId) {
  const u = usuarios.find((x) => x.id === userId);
  return u ? `${u.nombre} ${u.apellido}` : userId;
}

export default function AdminPlanes() {
  const [planes, setPlanes] = useState(planesMock);
  const [borradores, setBorradores] = useState(() => (
    planesMock.reduce((acc, p) => {
      acc[p.id] = {
        precio: String(p.precio),
        discoMaxMB: String(p.discoMaxMB),
        habilitado: p.habilitado,
      };
      return acc;
    }, {})
  ));
  const [solicitudes, setSolicitudes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlanes, setIsLoadingPlanes] = useState(true);
  const [isLoadingSolicitudes, setIsLoadingSolicitudes] = useState(true);
  const [isUpdatingSolicitud, setIsUpdatingSolicitud] = useState(false);

  useEffect(() => {
    const cargarPlanes = async () => {
      setIsLoadingPlanes(true);
      try {
        const result = await AdminPlanService.listPlans();

        if (!result.ok) {
          showErrorAlert({
            title: "Error al cargar planes",
            text: result.message || "No se pudieron cargar los planes desde el servidor.",
          });
          return;
        }

        const rawPlans = Array.isArray(result.data) ? result.data : [];
        const normalizedPlans = rawPlans.map((plan) => ({
          id: String(plan.id),
          nombre: plan.name ?? plan.nombre ?? "",
          precio: Number(plan.price ?? plan.precio ?? 0),
          discoMaxMB: plan.max_disk_mb ?? plan.discoMaxMB ?? 0,
          habilitado: (plan.status ?? plan.estado ?? "active") === "active",
        }));

        setPlanes(normalizedPlans);
        setBorradores(
          normalizedPlans.reduce((acc, p) => {
            acc[p.id] = {
              precio: String(p.precio),
              discoMaxMB: String(p.discoMaxMB),
              habilitado: p.habilitado,
            };
            return acc;
          }, {})
        );
      } catch (error) {
        showErrorAlert({
          title: "Error al cargar planes",
          text: "No se pudieron cargar los planes desde el servidor.",
        });
      } finally {
        setIsLoadingPlanes(false);
      }
    };

    cargarPlanes();
  }, []);

  const cargarSolicitudes = async () => {
    setIsLoadingSolicitudes(true);
    try {
      const result = await AdminPlanChangeRequestService.listAll();
      if (!result.ok) {
        showErrorAlert({
          title: "Error al cargar solicitudes",
          text: result.message || "No se pudieron cargar las solicitudes de cambio de plan.",
        });
        setSolicitudes([]);
        return;
      }

      const raw = Array.isArray(result.data) ? result.data : [];
      const STATUS_MAP = {
        pending: "Pendiente",
        approved: "Aprobado",
        rejected: "Rechazado",
        completed: "Completada",
        cancelled: "Cancelada",
      };

      const mapped = raw.map((item) => {
        const meses = item.months ?? item.meses ?? null;
        const total = item.total_price ?? item.total ?? null;

        return {
          id: item.id,
          planSolicitado: item.requested_plan_name ?? "-",
          usuario: item.user_name ?? item.user_email ?? "-",
          tipo: "Cambio de plan",
          meses: meses == null ? "-" : meses,
          total: total == null ? "-" : Number(total),
          estado: STATUS_MAP[item.status] ?? item.status ?? "Pendiente",
          creadoEn: item.created_at ?? "-",
        };
      });

      setSolicitudes(mapped);
    } catch (error) {
      showErrorAlert({
        title: "Error al cargar solicitudes",
        text: "No se pudieron cargar las solicitudes de cambio de plan.",
      });
      setSolicitudes([]);
    } finally {
      setIsLoadingSolicitudes(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const handleGuardar = async () => {
    if (isLoadingPlanes) {
      return;
    }

    const cambios = planes
      .map((p) => {
        const draft = borradores[p.id];
        if (!draft) return null;

        const original = {
          precio: Number(p.precio ?? 0),
          discoMaxMB: Number(p.discoMaxMB ?? 0),
          habilitado: Boolean(p.habilitado),
        };

        const next = {
          precio: Number(draft.precio ?? 0),
          discoMaxMB: Number(draft.discoMaxMB ?? 0),
          habilitado: Boolean(draft.habilitado),
        };

        const hasChanges =
          original.precio !== next.precio ||
          original.discoMaxMB !== next.discoMaxMB ||
          original.habilitado !== next.habilitado;

        if (!hasChanges) return null;

        return {
          id: p.id,
          payload: {
            price: next.precio,
            max_disk_mb: next.discoMaxMB,
            status: next.habilitado ? "active" : "inactive",
          },
        };
      })
      .filter(Boolean);

    if (cambios.length === 0) {
      showSuccessAlert({
        title: "Sin cambios",
        text: "No hay cambios por guardar.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const results = await Promise.all(
        cambios.map((c) => AdminPlanService.updatePlan(c.id, c.payload))
      );

      const failures = results.filter((r) => !r.ok);

      if (failures.length === 0) {
        showSuccessAlert({
          title: "Planes actualizados",
          text: "Los cambios fueron guardados correctamente.",
        });
      } else if (failures.length === cambios.length) {
        showErrorAlert({
          title: "Error",
          text: failures[0]?.message || "No se pudieron actualizar los planes.",
        });
      } else {
        showErrorAlert({
          title: "Actualización parcial",
          text: "Algunos planes no se pudieron actualizar.",
        });
      }

      const reload = await AdminPlanService.listPlans();
      if (reload.ok) {
        const rawPlans = Array.isArray(reload.data) ? reload.data : [];
        const normalizedPlans = rawPlans.map((plan) => ({
          id: String(plan.id),
          nombre: plan.name ?? plan.nombre ?? "",
          precio: Number(plan.price ?? plan.precio ?? 0),
          discoMaxMB: plan.max_disk_mb ?? plan.discoMaxMB ?? 0,
          habilitado: (plan.status ?? plan.estado ?? "active") === "active",
        }));

        setPlanes(normalizedPlans);
        setBorradores(
          normalizedPlans.reduce((acc, p) => {
            acc[p.id] = {
              precio: String(p.precio),
              discoMaxMB: String(p.discoMaxMB),
              habilitado: p.habilitado,
            };
            return acc;
          }, {})
        );
      }
    } catch (error) {
      showErrorAlert({
        title: "Error",
        text: "Ocurrió un error al actualizar los planes.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setBorradores(
      planes.reduce((acc, p) => {
        acc[p.id] = {
          precio: String(p.precio),
          discoMaxMB: String(p.discoMaxMB),
          habilitado: p.habilitado,
        };
        return acc;
      }, {})
    );
  };

  const updateBorrador = (id, campo, valor) => {
    setBorradores((prev) => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor },
    }));
  };

  const handleAprobar = async (id) => {
    if (isUpdatingSolicitud) return;

    setIsUpdatingSolicitud(true);
    try {
      const result = await AdminPlanChangeRequestService.approve(id);
      if (!result.ok) {
        showErrorAlert({
          title: "Error al aprobar",
          text: result.message || "No se pudo aprobar la solicitud.",
        });
        return;
      }

      showSuccessAlert({
        title: "Solicitud aprobada",
        text: "La solicitud fue aprobada y el plan actualizado correctamente.",
      });

      await cargarSolicitudes();
    } catch (error) {
      showErrorAlert({
        title: "Error al aprobar",
        text: "Ocurrió un error al aprobar la solicitud.",
      });
    } finally {
      setIsUpdatingSolicitud(false);
    }
  };

  const handleRechazar = async (id) => {
    if (isUpdatingSolicitud) return;

    setIsUpdatingSolicitud(true);
    try {
      const result = await AdminPlanChangeRequestService.reject(id);
      if (!result.ok) {
        showErrorAlert({
          title: "Error al rechazar",
          text: result.message || "No se pudo rechazar la solicitud.",
        });
        return;
      }

      showSuccessAlert({
        title: "Solicitud rechazada",
        text: "La solicitud fue rechazada correctamente.",
      });

      await cargarSolicitudes();
    } catch (error) {
      showErrorAlert({
        title: "Error al rechazar",
        text: "Ocurrió un error al rechazar la solicitud.",
      });
    } finally {
      setIsUpdatingSolicitud(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Planes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Catálogo de planes del sistema</p>
      </div>

      {/* Catálogo de planes */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Catálogo de planes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Campos: nombre, estado, precio, tamaño_disco_máximo
            </p>
          </div>
          <div className="flex gap-2">
            <BaseButton variant="secondary" onClick={handleReset}>
              <RefreshCcw className="h-4 w-4 mr-1.5" />
              Restablecer
            </BaseButton>
            <BaseButton onClick={handleGuardar} isLoading={isSaving}>
              <Save className="h-4 w-4 mr-1.5" />
              Guardar
            </BaseButton>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["nombre", "estado", "precio ($)", "tamaño_disco_máximo (MB)"].map((col) => (
                  <th
                    key={col}
                    className="py-3 px-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoadingPlanes ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    Cargando planes...
                  </td>
                </tr>
              ) : planes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                    No hay planes registrados.
                  </td>
                </tr>
              ) : (
                planes.map((p) => {
                  const borrador = borradores[p.id] || {
                    precio: String(p.precio ?? 0),
                    discoMaxMB: String(p.discoMaxMB ?? 0),
                    habilitado: p.habilitado ?? true,
                  };
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-5 font-medium text-gray-900">{p.nombre || p.name}</td>
                      <td className="py-3 px-5">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={borrador.habilitado}
                            onChange={(e) => updateBorrador(p.id, "habilitado", e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                          <span className="ml-2 text-xs text-gray-600">
                            {borrador.habilitado ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                      </td>
                      <td className="py-3 px-5">
                        <input
                          type="number"
                          min="0"
                          value={borrador.precio}
                          onChange={(e) => updateBorrador(p.id, "precio", e.target.value)}
                          className="h-8 w-28 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
                        />
                      </td>
                      <td className="py-3 px-5">
                        <input
                          type="number"
                          min="0"
                          value={borrador.discoMaxMB}
                          onChange={(e) => updateBorrador(p.id, "discoMaxMB", e.target.value)}
                          className="h-8 w-28 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </BaseCard>

      {/* Solicitudes de plan */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Solicitudes de plan</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            El admin puede aprobar o rechazar solicitudes de compra, renovación o upgrade
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Plan", "Usuario", "Tipo", "Meses", "Total", "Estado", "Fecha", "Acciones"].map(
                  (col) => (
                    <th
                      key={col}
                      className={`py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        col === "Acciones" || col === "Total" || col === "Meses"
                          ? "text-right"
                          : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isLoadingSolicitudes ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : solicitudes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    No hay solicitudes registradas.
                  </td>
                </tr>
              ) : (
                solicitudes.map((s) => {
                  const puedeActuar = s.estado === "Pendiente";
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">{s.planSolicitado}</td>
                      <td className="py-3 px-4 text-gray-500">{s.usuario || getNombreUsuario(s.usuarioId)}</td>
                      <td className="py-3 px-4 text-gray-500">{s.tipo}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{s.meses}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        {s.total === "-" ? "-" : `$${s.total}`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            ESTADO_SOLICITUD_CLASES[s.estado] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {s.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{s.creadoEn}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <BaseButton
                            className="h-7 px-2.5 text-xs"
                            disabled={!puedeActuar || isUpdatingSolicitud}
                            onClick={() => handleAprobar(s.id)}
                          >
                            Aprobar
                          </BaseButton>
                          <BaseButton
                            variant="secondary"
                            className="h-7 px-2.5 text-xs"
                            disabled={!puedeActuar || isUpdatingSolicitud}
                            onClick={() => handleRechazar(s.id)}
                          >
                            Rechazar
                          </BaseButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </BaseCard>
    </div>
  );
}
