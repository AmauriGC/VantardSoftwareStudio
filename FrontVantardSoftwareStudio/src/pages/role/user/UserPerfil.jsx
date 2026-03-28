import { useState } from "react";
import { Pencil } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseInput from "../../../components/BaseInput";
import BaseModal from "../../../components/BaseModal";
import { usuarioActual } from "../../../data/mockData";
import { getAuth } from "../../auth/store/authStore";
import { showSuccessAlert } from "../../../kernel/alerts";

export default function UserPerfil() {
  const auth = getAuth();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nombre, setNombre] = useState(usuarioActual.nombre);
  const [apellido, setApellido] = useState(usuarioActual.apellido);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGuardar = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSubmitting(false);
    setModalAbierto(false);
    showSuccessAlert({ title: "Perfil actualizado", text: "Tus datos fueron guardados correctamente." });
  };

  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Información de tu cuenta</p>
      </div>

      {/* Tarjeta de perfil */}
      <BaseCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold shrink-0">
              {iniciales}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {nombre} {apellido}
              </h2>
              <p className="text-sm text-gray-500">{auth?.email || usuarioActual.email}</p>
            </div>
          </div>
          <BaseButton variant="secondary" onClick={() => setModalAbierto(true)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Editar
          </BaseButton>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Nombre
            </p>
            <p className="text-sm text-gray-900">{nombre}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Apellido
            </p>
            <p className="text-sm text-gray-900">{apellido}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Correo electrónico
            </p>
            <p className="text-sm text-gray-900">{auth?.email || usuarioActual.email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Rol
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              Usuario
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Plan actual
            </p>
            <p className="text-sm text-gray-900">{usuarioActual.plan}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Estado del plan
            </p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
              {usuarioActual.estadoPlan}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Miembro desde
            </p>
            <p className="text-sm text-gray-900">{usuarioActual.creadoEn}</p>
          </div>
        </div>
      </BaseCard>

      {/* Sección de contraseña */}
      <BaseCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Contraseña</h2>
            <p className="text-xs text-gray-500 mt-0.5">Actualiza tu contraseña de acceso</p>
          </div>
          <BaseButton variant="secondary">Cambiar contraseña</BaseButton>
        </div>
      </BaseCard>

      {/* Modal editar */}
      <BaseModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Editar perfil"
        footer={
          <>
            <BaseButton
              variant="secondary"
              onClick={() => setModalAbierto(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </BaseButton>
            <BaseButton onClick={handleGuardar} isLoading={isSubmitting}>
              Guardar
            </BaseButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <BaseInput
              id="edit-nombre"
              label="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <BaseInput
              id="edit-apellido"
              label="Apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
          </div>
          <BaseInput
            id="edit-email"
            label="Correo electrónico"
            type="email"
            value={auth?.email || usuarioActual.email}
            disabled
          />
        </div>
      </BaseModal>
    </div>
  );
}
