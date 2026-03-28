import { useState } from "react";
import PropTypes from "prop-types";
import { Search, Pause, Trash2, Pencil, Eye } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseInput from "../../../components/BaseInput";
import BaseModal from "../../../components/BaseModal";
import { despliegues, usuarios } from "../../../data/mockData";
import { showSuccessAlert, confirmAction } from "../../../kernel/alerts";

const ESTADO_CLASES = {
  Activo: "bg-green-50 text-green-700",
  Actualizando: "bg-blue-50 text-blue-700",
  Error: "bg-red-50 text-red-700",
  Suspendido: "bg-gray-100 text-gray-600",
};

function EstadoBadge({ estado }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        ESTADO_CLASES[estado] || "bg-gray-100 text-gray-600"
      }`}
    >
      {estado}
    </span>
  );
}

EstadoBadge.propTypes = {
  estado: PropTypes.string.isRequired,
};

function getNombreUsuario(userId) {
  const u = usuarios.find((x) => x.id === userId);
  return u ? `${u.nombre} ${u.apellido}` : userId;
}

export default function AdminDespliegues() {
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // "ver" | "cambiar-dominio" | "suspender" | "eliminar"
  const [seleccionado, setSeleccionado] = useState(null);
  const [nuevoDominio, setNuevoDominio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtrados = despliegues.filter(
    (d) =>
      d.dominio.toLowerCase().includes(busqueda.toLowerCase()) ||
      getNombreUsuario(d.usuarioId).toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirModal = (tipo, despliegue) => {
    setModal(tipo);
    setSeleccionado(despliegue);
    setNuevoDominio("");
  };

  const cerrarModal = () => {
    setModal(null);
    setSeleccionado(null);
  };

  const handleCambiarDominio = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    cerrarModal();
    showSuccessAlert({ title: "Dominio actualizado", text: "El dominio fue cambiado correctamente." });
  };

  const handleSuspender = async (despliegue) => {
    const ok = await confirmAction({
      title: "Suspender despliegue",
      text: `¿Quieres suspender "${despliegue?.dominio}"?`,
      confirmText: "Suspender",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    showSuccessAlert({ title: "Despliegue suspendido", text: "El despliegue fue suspendido." });
  };

  const handleEliminar = async () => {
    const ok = await confirmAction({
      title: "Eliminar despliegue",
      text: `¿Quieres eliminar "${seleccionado?.dominio}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    cerrarModal();
    showSuccessAlert({ title: "Despliegue eliminado", text: "El despliegue fue eliminado." });
  };

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
              onChange={(e) => setBusqueda(e.target.value)}
              className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 hover:border-gray-300 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Dominio", "Usuario", "Estado", "Disco (MB)", "Tráfico", "Acciones"].map(
                  (col) => (
                    <th
                      key={col}
                      className={`py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        col === "Acciones" ? "text-right" : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    No se encontraron despliegues.
                  </td>
                </tr>
              ) : (
                filtrados.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-gray-900 text-xs">
                      {d.dominio}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {getNombreUsuario(d.usuarioId)}
                    </td>
                    <td className="py-3 px-4">
                      <EstadoBadge estado={d.estado} />
                    </td>
                    <td className="py-3 px-4 text-gray-500">{d.usoDiscoMB}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {d.trafico.toLocaleString("es-MX")}
                    </td>
                    <td className="py-3 px-4">
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
                          onClick={() => abrirModal("cambiar-dominio", d)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Cambiar dominio"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSuspender(d)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                          title="Suspender"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModal("eliminar", d)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                <p className="font-mono font-medium text-gray-900">{seleccionado.dominio}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Estado</p>
                <EstadoBadge estado={seleccionado.estado} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Usuario</p>
                <p className="font-medium text-gray-900">{getNombreUsuario(seleccionado.usuarioId)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Disco usado</p>
                <p className="font-medium text-gray-900">{seleccionado.usoDiscoMB} MB</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tráfico</p>
                <p className="font-medium text-gray-900">
                  {seleccionado.trafico.toLocaleString("es-MX")} visitas
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Creado</p>
                <p className="font-medium text-gray-900">{seleccionado.creadoEn}</p>
              </div>
            </div>
          </div>
        )}
      </BaseModal>

      {/* Modal cambiar dominio */}
      <BaseModal
        open={modal === "cambiar-dominio"}
        onClose={cerrarModal}
        title="Cambiar dominio"
        footer={
          <>
            <BaseButton variant="secondary" onClick={cerrarModal} disabled={isSubmitting}>
              Cancelar
            </BaseButton>
            <BaseButton onClick={handleCambiarDominio} isLoading={isSubmitting}>
              Guardar
            </BaseButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Dominio actual</p>
            <p className="font-mono text-sm text-gray-700">{seleccionado?.dominio}</p>
          </div>
          <BaseInput
            id="nuevo-dominio"
            label="Nuevo dominio"
            placeholder="nuevo-nombre.vss.app"
            value={nuevoDominio}
            onChange={(e) => setNuevoDominio(e.target.value)}
          />
        </div>
      </BaseModal>

      {/* Modal eliminar */}
      <BaseModal
        open={modal === "eliminar"}
        onClose={cerrarModal}
        title="Eliminar despliegue"
        footer={
          <>
            <BaseButton variant="secondary" onClick={cerrarModal}>
              Cancelar
            </BaseButton>
            <BaseButton
              onClick={handleEliminar}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </BaseButton>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          ¿Estás seguro de que quieres eliminar el despliegue{" "}
          <span className="font-mono font-semibold text-gray-900">{seleccionado?.dominio}</span>?
          Esta acción no se puede deshacer.
        </p>
      </BaseModal>
    </div>
  );
}
