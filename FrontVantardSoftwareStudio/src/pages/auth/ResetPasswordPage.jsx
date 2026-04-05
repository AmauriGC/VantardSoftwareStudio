import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import BaseButton from "../../components/BaseButton";
import BaseInput from "../../components/BaseInput";
import AuthLayout from "./components/AuthLayout";
import { useValidatedField, VALIDATION_GROUPS } from "../../config/validator";
import { showErrorAlert, showSuccessAlert } from "../../kernel/alerts";
import AuthService from "./service/AuthService";

function buildPasswordChecklist(password) {
  const value = String(password ?? "");
  return [
    { label: "Mínimo 8 caracteres", ok: value.length >= 8 },
    { label: "Al menos una mayúscula", ok: /[A-Z]/.test(value) },
    { label: "Al menos una minúscula", ok: /[a-z]/.test(value) },
    { label: "Al menos un número", ok: /\d/.test(value) },
    { label: "Al menos un carácter especial", ok: /[^A-Za-z0-9]/.test(value) },
  ];
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const uid = useMemo(() => String(searchParams.get("uid") ?? "").trim(), [searchParams]);
  const token = useMemo(() => String(searchParams.get("token") ?? "").trim(), [searchParams]);

  const passwordField = useValidatedField("", VALIDATION_GROUPS.registerPassword);
  const confirmField = useValidatedField(
    "",
    VALIDATION_GROUPS.confirmPassword,
    () => ({ password: passwordField.value })
  );
  const passwordChecklist = useMemo(
    () => buildPasswordChecklist(passwordField.value),
    [passwordField.value]
  );

  const isLinkInvalid = !uid || !token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isLinkInvalid) return;

    const validPassword = passwordField.validate();
    const validConfirm = confirmField.validate();
    if (!validPassword || !validConfirm) return;

    setIsSubmitting(true);
    const response = await AuthService.confirmPasswordReset({
      uid,
      token,
      newPassword: passwordField.value,
      confirmPassword: confirmField.value,
    });

    if (response.ok) {
      await showSuccessAlert({
        title: "Contraseña actualizada",
        text: response.message ?? "Ya puedes iniciar sesión con tu nueva contraseña.",
      });
      navigate("/", { replace: true });
    } else {
      showErrorAlert({
        title: "No se pudo restablecer la contraseña",
        text: response.message ?? "El enlace puede haber expirado.",
      });
    }

    setIsSubmitting(false);
  };

  if (isLinkInvalid) {
    return <Navigate to="/auth/recuperar" replace />;
  }

  return (
    <AuthLayout
      title="Define tu nueva contraseña"
      subtitle="Escribe una contraseña segura para completar el restablecimiento"
      footer={
        <div className="flex items-center justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-300 hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            <span>Volver a iniciar sesión</span>
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <BaseInput
          id="new-password"
          type={showPassword ? "text" : "password"}
          label="Nueva contraseña"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={passwordField.value}
          onChange={passwordField.onChange}
          onBlur={passwordField.onBlur}
          error={passwordField.error}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="h-11 px-3 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Tu contraseña debe cumplir:</p>
          <ul className="space-y-1">
            {passwordChecklist.map((item) => (
              <li
                key={item.label}
                className={`text-xs ${item.ok ? "text-emerald-700" : "text-gray-500"}`}
              >
                {item.ok ? "✓" : "•"} {item.label}
              </li>
            ))}
          </ul>
        </div>

        <BaseInput
          id="confirm-password"
          type={showConfirmPassword ? "text" : "password"}
          label="Confirmar contraseña"
          autoComplete="new-password"
          placeholder="Repite tu nueva contraseña"
          value={confirmField.value}
          onChange={confirmField.onChange}
          onBlur={confirmField.onBlur}
          error={confirmField.error}
          rightAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPassword((s) => !s)}
              className="h-11 px-3 text-gray-500 hover:text-gray-700"
              aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <BaseButton type="submit" className="h-11 w-full" disabled={isSubmitting} isLoading={isSubmitting}>
          Restablecer contraseña
        </BaseButton>
      </form>
    </AuthLayout>
  );
}
