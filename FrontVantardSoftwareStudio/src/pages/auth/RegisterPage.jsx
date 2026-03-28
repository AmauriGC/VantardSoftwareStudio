import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import BaseButton from "../../components/BaseButton";
import BaseInput from "../../components/BaseInput";
import AuthLayout from "./components/AuthLayout";
import { useValidatedField, VALIDATION_GROUPS } from "../../config/validator";
import { showSuccessAlert } from "../../kernel/alerts";

export default function RegisterPage() {
  const fullNameField = useValidatedField("", VALIDATION_GROUPS.fullName);
  const emailField = useValidatedField("", VALIDATION_GROUPS.authEmail);
  const passwordField = useValidatedField("", VALIDATION_GROUPS.registerPassword);
  const confirmPasswordField = useValidatedField(
    "",
    VALIDATION_GROUPS.confirmPassword,
    () => ({ password: passwordField.value })
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const ok =
      fullNameField.validate() &&
      emailField.validate() &&
      passwordField.validate() &&
      confirmPasswordField.validate();
    if (!ok) return;

    // Sin consumo por ahora (UX solamente)
    setIsSubmitting(true);
    showSuccessAlert({
      title: "Cuenta creada",
      text: "Tu cuenta fue creada correctamente. Ya puedes iniciar sesión.",
    });
    setIsSubmitting(false);
  };

  return (
    <AuthLayout
      title="Crear una cuenta"
      subtitle="Comienza a alojar tus sitios estáticos hoy"
      footer={
        <p className="text-center text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Iniciar sesión
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <BaseInput
          id="fullName"
          label="Nombre completo"
          placeholder="John Doe"
          value={fullNameField.value}
          onChange={fullNameField.onChange}
          onBlur={fullNameField.onBlur}
          error={fullNameField.error}
          autoComplete="name"
        />

        <BaseInput
          id="email"
          type="email"
          label="Correo"
          placeholder="you@example.com"
          value={emailField.value}
          onChange={emailField.onChange}
          onBlur={emailField.onBlur}
          error={emailField.error}
          autoComplete="email"
        />

        <BaseInput
          id="password"
          type={showPassword ? "text" : "password"}
          label="Contraseña"
          placeholder="Ingresa tu contraseña"
          value={passwordField.value}
          onChange={passwordField.onChange}
          onBlur={passwordField.onBlur}
          error={passwordField.error}
          autoComplete="new-password"
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

        <BaseInput
          id="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          label="Confirmar contraseña"
          placeholder="Vuelve a ingresar tu contraseña"
          value={confirmPasswordField.value}
          onChange={confirmPasswordField.onChange}
          onBlur={confirmPasswordField.onBlur}
          error={confirmPasswordField.error}
          autoComplete="new-password"
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

        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Plan por defecto</p>
          <p className="mt-1 text-sm text-gray-700">
            Todas las cuentas nuevas inician en el plan Basic gratuito (50MB de almacenamiento, 5MB de
            límite de subida). Las mejoras se asignan por un admin después de confirmar el pago.
          </p>
        </div>

        <BaseButton type="submit" className="h-11 w-full" disabled={isSubmitting} isLoading={isSubmitting}>
          Crear cuenta
        </BaseButton>
      </form>
    </AuthLayout>
  );
}
