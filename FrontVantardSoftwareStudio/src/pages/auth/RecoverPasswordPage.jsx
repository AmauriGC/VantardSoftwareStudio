import { useState } from "react";
import { Link } from "react-router-dom";

import BaseButton from "../../components/BaseButton";
import BaseInput from "../../components/BaseInput";
import AuthLayout from "./components/AuthLayout";
import { useValidatedField, VALIDATION_GROUPS } from "../../config/validator";
import { showErrorAlert, showSuccessAlert } from "../../kernel/alerts";
import AuthService from "./service/AuthService";

export default function RecoverPasswordPage() {
  const emailField = useValidatedField("", VALIDATION_GROUPS.authEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!emailField.validate()) return;

    setIsSubmitting(true);
    const response = await AuthService.requestPasswordReset({ email: emailField.value });

    if (response.ok) {
      showSuccessAlert({
        title: "Solicitud enviada",
        text:
          response.message ??
          "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
      });
    } else {
      showErrorAlert({
        title: "No se pudo procesar la solicitud",
        text: response.message ?? "Inténtalo nuevamente.",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <AuthLayout
      title="Restablecer tu contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace de restablecimiento"
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
          id="email"
          type="email"
          label="Correo"
          autoComplete="email"
          placeholder="you@example.com"
          value={emailField.value}
          onChange={emailField.onChange}
          onBlur={emailField.onBlur}
          error={emailField.error}
        />

        <BaseButton type="submit" className="h-11 w-full" disabled={isSubmitting} isLoading={isSubmitting}>
          Enviar enlace de restablecimiento
        </BaseButton>
      </form>
    </AuthLayout>
  );
}
