import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";

import BaseCard from "../../../components/BaseCard";
import BaseButton from "../../../components/BaseButton";
import BaseInput from "../../../components/BaseInput";
import BaseModal from "../../../components/BaseModal";
import { confirmAction, showErrorAlert, showSuccessAlert } from "../../../kernel/alerts";
import { clearAuth, getAuth } from "../../auth/store/authStore";
import UserService from "./service/UserService";

export default function UserPerfil() {
  const navigate = useNavigate();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [passwordModalAbierto, setPasswordModalAbierto] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const iniciales = useMemo(() => {
    const first = (profile?.first_name ?? "").trim().charAt(0);
    const last = (profile?.last_name ?? "").trim().charAt(0);
    return `${first}${last}`.toUpperCase() || "U";
  }, [profile]);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const result = await UserService.getProfile();
      if (!result.ok) {
        showErrorAlert({
          title: "No se pudo cargar el perfil",
          text: result.message || "Intenta de nuevo en unos minutos.",
        });
        setIsLoading(false);
        return;
      }

      const nextProfile = result.data;
      setProfile(nextProfile);
      setNombre(nextProfile?.first_name ?? "");
      setApellido(nextProfile?.last_name ?? "");
      setIsLoading(false);
    };

    loadProfile();
  }, []);

  const handleGuardar = async () => {
    if (isProfileSubmitting) return;
    if (!nombre.trim() || !apellido.trim()) {
      showErrorAlert({
        title: "Datos incompletos",
        text: "Nombre y apellido son obligatorios.",
      });
      return;
    }

    setIsProfileSubmitting(true);
    const result = await UserService.updateProfile({
      first_name: nombre.trim(),
      last_name: apellido.trim(),
    });

    if (!result.ok) {
      showErrorAlert({
        title: "No se pudo actualizar el perfil",
        text: result.message || "Intenta nuevamente.",
      });
      setIsProfileSubmitting(false);
      return;
    }

    setProfile(result.data);
    setNombre(result.data?.first_name ?? "");
    setApellido(result.data?.last_name ?? "");
    setModalAbierto(false);
    setIsProfileSubmitting(false);
    showSuccessAlert({ title: "Perfil actualizado", text: "Tus datos se guardaron correctamente." });
  };

  const handleCambiarPassword = async () => {
    if (isPasswordSubmitting) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showErrorAlert({
        title: "Datos incompletos",
        text: "Debes completar todos los campos de la contrasena.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorAlert({
        title: "Contrasenas no coinciden",
        text: "La nueva contrasena y la confirmacion deben ser iguales.",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    const result = await UserService.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });

    if (!result.ok) {
      showErrorAlert({
        title: "No se pudo cambiar la contrasena",
        text: result.message || "Intenta nuevamente.",
      });
      setIsPasswordSubmitting(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalAbierto(false);
    setIsPasswordSubmitting(false);
    showSuccessAlert({ title: "Contrasena actualizada", text: "Se guardo tu nueva contrasena." });
  };

  const handleEliminarCuenta = async () => {
    if (isDeleteSubmitting) return;

    const confirmed = await confirmAction({
      title: "Eliminar cuenta",
      text: "Esta accion desactivara tu cuenta. Deseas continuar?",
      confirmText: "Si, eliminar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    setIsDeleteSubmitting(true);
    const result = await UserService.deleteAccount();

    if (!result.ok) {
      showErrorAlert({
        title: "No se pudo eliminar la cuenta",
        text: result.message || "Intenta nuevamente.",
      });
      setIsDeleteSubmitting(false);
      return;
    }

    const auth = getAuth();
    clearAuth();
    showSuccessAlert({ title: "Cuenta eliminada", text: "Tu cuenta fue desactivada correctamente." });
    navigate("/", { replace: true, state: { email: auth?.email || null } });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <BaseCard className="p-6">
          <p className="text-sm text-gray-600">Cargando perfil...</p>
        </BaseCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Informacion de tu cuenta</p>
      </div>

      <BaseCard className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold shrink-0">
              {iniciales}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {profile?.first_name} {profile?.last_name}
              </h2>
              <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>
          </div>
          <BaseButton variant="secondary" onClick={() => setModalAbierto(true)}>
            <Pencil className="h-4 w-4 mr-1.5" />
            Editar
          </BaseButton>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Nombre</p>
            <p className="text-sm text-gray-900">{profile?.first_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Apellido</p>
            <p className="text-sm text-gray-900">{profile?.last_name || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Correo electronico</p>
            <p className="text-sm text-gray-900">{profile?.email || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Rol</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              {profile?.role_name || "User"}
            </span>
          </div>
        </div>
      </BaseCard>

      <BaseCard className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Contrasena</h2>
            <p className="text-sm text-gray-500">Actualiza tu contrasena de acceso.</p>
          </div>
          <BaseButton variant="secondary" onClick={() => setPasswordModalAbierto(true)}>
            Cambiar contrasena
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard className="p-6 border border-red-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-red-700">Zona de riesgo</h2>
            <p className="text-sm text-gray-600">Si eliminas tu cuenta, perderas acceso inmediatamente.</p>
          </div>
          <BaseButton
            variant="secondary"
            onClick={handleEliminarCuenta}
            disabled={isDeleteSubmitting}
            isLoading={isDeleteSubmitting}
            className="border border-red-500 text-red-600 hover:bg-red-50"
          >
            Eliminar cuenta
          </BaseButton>
        </div>
      </BaseCard>

      <BaseModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title="Editar perfil"
        footer={
          <>
            <BaseButton
              variant="secondary"
              onClick={() => setModalAbierto(false)}
              disabled={isProfileSubmitting}
            >
              Cancelar
            </BaseButton>
            <BaseButton onClick={handleGuardar} isLoading={isProfileSubmitting}>
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
          <BaseInput id="edit-email" label="Correo electronico" type="email" value={profile?.email || ""} disabled />
        </div>
      </BaseModal>

      <BaseModal
        open={passwordModalAbierto}
        onClose={() => setPasswordModalAbierto(false)}
        title="Cambiar contrasena"
        footer={
          <>
            <BaseButton
              variant="secondary"
              onClick={() => setPasswordModalAbierto(false)}
              disabled={isPasswordSubmitting}
            >
              Cancelar
            </BaseButton>
            <BaseButton onClick={handleCambiarPassword} isLoading={isPasswordSubmitting}>
              Guardar
            </BaseButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <BaseInput
            id="current-password"
            type="password"
            label="Contrasena actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <BaseInput
            id="new-password"
            type="password"
            label="Nueva contrasena"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <BaseInput
            id="confirm-password"
            type="password"
            label="Confirmar nueva contrasena"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </BaseModal>
    </div>
  );
}
