import { useState } from "react";
import PropTypes from "prop-types";
import { Plus, Eye, Pencil, Trash2, Search } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseInput from "../../../components/BaseInput";
import BaseModal from "../../../components/BaseModal";
import { usuarios, despliegues } from "../../../data/mockData";
import { showSuccessAlert, confirmAction } from "../../../kernel/alerts";

const ESTADO_CLASES = {
  Activo: "bg-green-50 text-green-700",
  Suspendido: "bg-orange-50 text-orange-700",
  PendientePago: "bg-yellow-50 text-yellow-700",
  Expirado: "bg-red-50 text-red-700",
};

const DESPLIEGUE_ESTADO_CLASES = {
  Activo: "bg-green-50 text-green-700",
  Error: "bg-red-50 text-red-700",
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

export default function AdminUsuarios() {
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(null); // "crear" | "editar" | "ver" | "eliminar"
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [formNombre, setFormNombre] = useState("");
  const [formApellido, setFormApellido] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.apellido.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirModal = (tipo, usuario = null) => {
    setModal(tipo);
    setUsuarioSeleccionado(usuario);
    if (usuario) {
      setFormNombre(usuario.nombre);
      setFormApellido(usuario.apellido);
      setFormEmail(usuario.email);
    } else {
      setFormNombre("");
      setFormApellido("");
      setFormEmail("");
    }
  };

  const cerrarModal = () => {
    setModal(null);
    setUsuarioSeleccionado(null);
  };

  const handleGuardar = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsSubmitting(false);
    cerrarModal();
    showSuccessAlert({
      title: modal === "crear" ? "Usuario creado" : "Usuario actualizado",
      text:
        modal === "crear"
          ? "El usuario fue creado correctamente."
          : "Los datos del usuario fueron actualizados.",
    });
  };

  const handleEliminar = async () => {
    const ok = await confirmAction({
      title: "Eliminar usuario",
      text: `¿Quieres eliminar a ${usuarioSeleccionado?.nombre} ${usuarioSeleccionado?.apellido}? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;
    cerrarModal();
    showSuccessAlert({ title: "Usuario eliminado", text: "El usuario fue eliminado del sistema." });
  };

  const desplieguesDelUsuario = usuarioSeleccionado
    ? despliegues.filter((d) => d.usuarioId === usuarioSeleccionado.id)
    : [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de usuarios del sistema</p>
        </div>
        <BaseButton onClick={() => abrirModal("crear")}>
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar
        </BaseButton>
      </div>

      {/* Tabla de usuarios */}
      <BaseCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-900">Lista de usuarios</h2>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
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
                {["Nombre", "Apellido", "Email", "Estado", "Plan", "Despliegues", "Acciones"].map(
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
                  <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filtrados.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">{u.nombre}</td>
                    <td className="py-3 px-4 text-gray-500">{u.apellido}</td>
                    <td className="py-3 px-4 text-gray-500">{u.email}</td>
                    <td className="py-3 px-4">
                      <EstadoBadge estado={u.estadoPlan} />
                    </td>
                    <td className="py-3 px-4 text-gray-500">{u.plan}</td>
                    <td className="py-3 px-4 text-gray-500">{u.totalDespliegues}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => abrirModal("ver", u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          aria-label="Ver detalle"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModal("editar", u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          aria-label="Editar"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModal("eliminar", u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          aria-label="Eliminar"
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

      {/* Modal crear / editar */}
      <BaseModal
        open={modal === "crear" || modal === "editar"}
        onClose={cerrarModal}
        title={modal === "crear" ? "Crear usuario" : "Editar usuario"}
        footer={
          <>
            <BaseButton variant="secondary" onClick={cerrarModal} disabled={isSubmitting}>
              Cancelar
            </BaseButton>
            <BaseButton onClick={handleGuardar} isLoading={isSubmitting}>
              {modal === "crear" ? "Crear" : "Guardar"}
            </BaseButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <BaseInput
              id="form-nombre"
              label="Nombre"
              placeholder="Juan"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
            />
            <BaseInput
              id="form-apellido"
              label="Apellido"
              placeholder="Pérez"
              value={formApellido}
              onChange={(e) => setFormApellido(e.target.value)}
            />
          </div>
          <BaseInput
            id="form-email"
            label="Correo electrónico"
            type="email"
            placeholder="juan@ejemplo.com"
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
          />
          {modal === "crear" && (
            <>
              <BaseInput id="form-password" label="Contraseña" type="password" placeholder="••••••••" />
              <BaseInput
                id="form-confirm-password"
                label="Confirmar contraseña"
                type="password"
                placeholder="••••••••"
              />
            </>
          )}
        </div>
      </BaseModal>

      {/* Modal ver detalle */}
      <BaseModal
        open={modal === "ver"}
        onClose={cerrarModal}
        title="Detalle del usuario"
        footer={
          <BaseButton variant="secondary" onClick={cerrarModal}>
            Cerrar
          </BaseButton>
        }
      >
        {usuarioSeleccionado && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-semibold shrink-0">
                {usuarioSeleccionado.nombre.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {usuarioSeleccionado.nombre} {usuarioSeleccionado.apellido}
                </p>
                <p className="text-sm text-gray-500">{usuarioSeleccionado.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Estado</p>
                <EstadoBadge estado={usuarioSeleccionado.estadoPlan} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Plan</p>
                <p className="font-medium text-gray-900">{usuarioSeleccionado.plan}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Despliegues</p>
                <p className="font-medium text-gray-900">{usuarioSeleccionado.totalDespliegues}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Disco usado</p>
                <p className="font-medium text-gray-900">{usuarioSeleccionado.usoDiscoMB} MB</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Registrado</p>
                <p className="font-medium text-gray-900">{usuarioSeleccionado.creadoEn}</p>
              </div>
            </div>
            {desplieguesDelUsuario.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Despliegues
                </p>
                <div className="flex flex-col gap-2">
                  {desplieguesDelUsuario.map((d) => {
                    const claseEstado =
                      DESPLIEGUE_ESTADO_CLASES[d.estado] || "bg-yellow-50 text-yellow-700";
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <span className="font-mono text-gray-700">{d.dominio}</span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${claseEstado}`}
                        >
                          {d.estado}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </BaseModal>

      {/* Modal eliminar */}
      <BaseModal
        open={modal === "eliminar"}
        onClose={cerrarModal}
        title="Eliminar usuario"
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
          ¿Estás seguro de que quieres eliminar a{" "}
          <span className="font-semibold text-gray-900">
            {`${usuarioSeleccionado?.nombre ?? ""} ${usuarioSeleccionado?.apellido ?? ""}`}
          </span>
          {" "}? Esta acción no se puede deshacer y se eliminarán todos sus despliegues.
        </p>
      </BaseModal>
    </div>
  );
}
