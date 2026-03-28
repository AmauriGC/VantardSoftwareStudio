import { useState } from "react";
import { Link } from "react-router-dom";

import BaseButton from "../../components/BaseButton";
import BaseInput from "../../components/BaseInput";
import AuthLayout from "./components/AuthLayout";
import { useValidatedField, VALIDATION_GROUPS } from "../../config/validator";
import { showSuccessAlert } from "../../kernel/alerts";

export default function RecoverPasswordPage() {
  const emailField = useValidatedField("", VALIDATION_GROUPS.authEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!emailField.validate()) return;

    // Sin consumo por ahora (UX solamente)
    setIsSubmitting(true);
    showSuccessAlert({
      title: "Solicitud enviada",
      text: "Si el correo existe, recibirás un enlace para restablecer tu contraseña.",
    });
    setIsSubmitting(false);
  };

  return (
    <AuthLayout
      title="Restablecer tu contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace de restablecimiento"
      footer={
        <div className="flex items-center justify-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">
            ← Volver a iniciar sesión
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
