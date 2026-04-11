import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Plus, Eye, Pencil, Search } from "lucide-react";
import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseInput from "../../../components/BaseInput";
import BaseModal from "../../../components/BaseModal";
import { showSuccessAlert, showErrorAlert, confirmAction } from "../../../kernel/alerts";
import AdminUserService from "./service/AdminUserService";
import { useValidatedField, VALIDATION_GROUPS } from "../../../config/validator";

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
  const [modal, setModal] = useState(null); // "crear" | "editar" | "ver"
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const nombreField = useValidatedField("", VALIDATION_GROUPS.adminUserFirstName);
  const apellidoField = useValidatedField("", VALIDATION_GROUPS.adminUserLastName);
  const emailField = useValidatedField("", VALIDATION_GROUPS.authEmail);
  const passwordField = useValidatedField("", VALIDATION_GROUPS.registerPassword);
  const confirmPasswordField = useValidatedField(
    "",
    VALIDATION_GROUPS.confirmPassword,
    () => ({ password: passwordField.value })
  );

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const result = await AdminUserService.listUsers();
      if (!result.ok) {
        showErrorAlert({
          title: "Error al cargar usuarios",
          text: result.message || "No se pudieron cargar los usuarios desde el servidor.",
        });
        setUsuarios([]);
        return;
      }
      setUsuarios(result.data || []);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      showErrorAlert({
        title: "Error al cargar usuarios",
        text: "No se pudieron cargar los usuarios desde el servidor.",
      });
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

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
      nombreField.reset(usuario.nombre ?? "");
      apellidoField.reset(usuario.apellido ?? "");
      emailField.reset(usuario.email ?? "");
      passwordField.reset("");
      confirmPasswordField.reset("");
    } else {
      nombreField.reset("");
      apellidoField.reset("");
      emailField.reset("");
      passwordField.reset("");
      confirmPasswordField.reset("");
    }
  };

  const cerrarModal = () => {
    setModal(null);
    setUsuarioSeleccionado(null);
  };

  const handleGuardar = async () => {
    setIsSubmitting(true);
    try {
      const okNombre = nombreField.validate();
      const okApellido = apellidoField.validate();
      const okEmail = emailField.validate();

      let okPassword = true;
      let okConfirm = true;

      if (modal === "crear") {
        okPassword = passwordField.validate();
        okConfirm = confirmPasswordField.validate();
      }

      if (!okNombre || !okApellido || !okEmail || !okPassword || !okConfirm) {
        return;
      }

      if (modal === "crear") {
        const result = await AdminUserService.createUser({
          nombre: nombreField.value,
          apellido: apellidoField.value,
          email: emailField.value,
          password: passwordField.value,
          confirmPassword: confirmPasswordField.value,
        });

        if (!result.ok) {
          showErrorAlert({
            title: "No se pudo crear el usuario",
            text: result.message || "Revisa los datos e inténtalo de nuevo.",
          });
          return;
        }

        showSuccessAlert({
          title: "Usuario creado",
          text: "El usuario fue creado correctamente.",
        });
      } else if (modal === "editar" && usuarioSeleccionado) {
        const result = await AdminUserService.updateUser(usuarioSeleccionado.id, {
          nombre: nombreField.value,
          apellido: apellidoField.value,
          email: emailField.value,
        });

        if (!result.ok) {
          showErrorAlert({
            title: "No se pudo actualizar el usuario",
            text: result.message || "Revisa los datos e inténtalo de nuevo.",
          });
          return;
        }

        showSuccessAlert({
          title: "Usuario actualizado",
          text: "Los datos del usuario fueron actualizados.",
        });
      }

      cerrarModal();
      await cargarUsuarios();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (usuario) => {
    if (!usuario || updatingStatusId !== null) return;

    const nextStatus = usuario.status === "active" ? "blocked" : "active";

    const isActivating = nextStatus === "active";
    const confirmed = await confirmAction({
      title: isActivating ? "Activar usuario" : "Suspender usuario",
      text: isActivating
        ? `¿Quieres activar la cuenta de ${usuario.nombre} ${usuario.apellido}?`
        : `¿Quieres suspender la cuenta de ${usuario.nombre} ${usuario.apellido}? El usuario no podrá iniciar sesión mientras esté suspendido.`,
      confirmText: isActivating ? "Activar" : "Suspender",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    setUpdatingStatusId(usuario.id);
    try {
      const result = await AdminUserService.updateStatus(usuario.id, nextStatus);

      if (!result.ok) {
        showErrorAlert({
          title: "No se pudo actualizar el estado",
          text: result.message || "Inténtalo de nuevo más tarde.",
        });
        return;
      }

      const nuevaEtiqueta = result.data?.label || usuario.estadoCuenta;

      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === usuario.id
            ? {
                ...u,
                status: nextStatus,
                    estadoCuenta: nuevaEtiqueta,
              }
            : u
        )
      );

      if (usuarioSeleccionado && usuarioSeleccionado.id === usuario.id) {
        setUsuarioSeleccionado((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                estadoCuenta: nuevaEtiqueta,
              }
            : prev
        );
      }

      showSuccessAlert({
        title: "Estado actualizado",
        text: `El usuario ahora está ${nextStatus === "active" ? "activo" : "suspendido"}.`,
      });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const desplieguesDelUsuario = [];

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
              name="user-search"
              autoComplete="off"
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
                {["Nombre", "Apellido", "Email", "Estado", "Rol", "Plan", "Despliegues", "Acciones"].map(
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
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
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={u.status === "active"}
                          onChange={() => handleToggleStatus(u)}
                          disabled={updatingStatusId === u.id}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                        <span className="ml-2 text-xs text-gray-600">{u.estadoCuenta}</span>
                      </label>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{u.rol}</td>
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
              autoComplete="given-name"
              value={nombreField.value}
              onChange={nombreField.onChange}
              onBlur={nombreField.onBlur}
              error={nombreField.error}
            />
            <BaseInput
              id="form-apellido"
              label="Apellido"
              placeholder="Pérez"
              autoComplete="family-name"
              value={apellidoField.value}
              onChange={apellidoField.onChange}
              onBlur={apellidoField.onBlur}
              error={apellidoField.error}
            />
          </div>
          <BaseInput
            id="form-email"
            label="Correo electrónico"
            type="email"
            placeholder="juan@ejemplo.com"
            autoComplete="email"
            value={emailField.value}
            onChange={emailField.onChange}
            onBlur={emailField.onBlur}
            error={emailField.error}
          />
          {modal === "crear" && (
            <BaseInput
              id="form-rol"
              label="Rol asignado"
              value="Admin"
              disabled
            />
          )}
          {modal === "crear" && (
            <>
              <BaseInput
                id="form-password"
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={passwordField.value}
                onChange={passwordField.onChange}
                onBlur={passwordField.onBlur}
                error={passwordField.error}
              />
              <BaseInput
                id="form-confirm-password"
                label="Confirmar contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPasswordField.value}
                onChange={confirmPasswordField.onChange}
                onBlur={confirmPasswordField.onBlur}
                error={confirmPasswordField.error}
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
                <EstadoBadge estado={usuarioSeleccionado.estadoCuenta} />
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Rol</p>
                <p className="font-medium text-gray-900">{usuarioSeleccionado.rol}</p>
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
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Despliegues
              </p>
              {desplieguesDelUsuario.length > 0 ? (
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
              ) : (
                <p className="text-xs text-gray-500">
                  Por ahora no se muestran los despliegues asociados al usuario en este panel.
                  Esta sección se habilitará en una próxima versión.
                </p>
              )}
            </div>
          </div>
        )}
      </BaseModal>

      {/* Modal eliminar */}
      {/* Modal eliminar eliminado: la acción ahora es cambiar status (switch) */}
    </div>
  );
}
