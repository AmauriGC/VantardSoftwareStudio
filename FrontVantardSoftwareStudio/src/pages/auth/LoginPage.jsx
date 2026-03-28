import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import BaseButton from "../../components/BaseButton";
import BaseInput from "../../components/BaseInput";
import AuthLayout from "./components/AuthLayout";
import AuthService from "./service/AuthService";
import { AUTH_EMAILS, AUTH_ROLES } from "./constants/authConstants";
import { getRole, setAuth } from "./store/authStore";
import { useValidatedField, VALIDATION_GROUPS } from "../../config/validator";
import { showErrorAlert, showInfoAlert } from "../../kernel/alerts";

const SESSION_EXPIRED_KEY = "vss.sessionExpired";

export default function LoginPage() {
  const navigate = useNavigate();

  const emailField = useValidatedField("", VALIDATION_GROUPS.authEmail);
  const passwordField = useValidatedField("", VALIDATION_GROUPS.loginPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const expired = globalThis.sessionStorage.getItem(SESSION_EXPIRED_KEY);
      if (expired) {
        globalThis.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
        showInfoAlert({
          title: "Sesión expirada",
          text: "Tu sesión expiró o no es válida. Inicia sesión nuevamente.",
        });
      }
    } catch {
      // ignore
    }

    const existingRole = getRole();

    if (existingRole === AUTH_ROLES.ADMIN) {
      navigate("/admin", { replace: true });
    }

    if (existingRole === AUTH_ROLES.USER) {
      navigate("/user", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const ok = emailField.validate() && passwordField.validate();
    if (!ok) return;

    setError("");
    setIsSubmitting(true);
    const result = AuthService.login({ email: emailField.value, password: passwordField.value });

    if (!result.ok) {
      setError(result.message || "No se pudo iniciar sesión.");
      showErrorAlert({
        title: "No se pudo iniciar sesión",
        text: result.message || "Verifica tus credenciales e inténtalo de nuevo.",
      });
      setIsSubmitting(false);
      return;
    }

    setAuth(result.data);
    navigate(result.data.role === AUTH_ROLES.ADMIN ? "/admin" : "/user", { replace: true });
  };

  const fillAdmin = () => {
    if (isSubmitting) return;
    emailField.setValue(AUTH_EMAILS.ADMIN, { shouldValidate: true });
    passwordField.setValue("123456", { shouldValidate: true });
    setError("");
  };

  const fillUser = () => {
    if (isSubmitting) return;
    emailField.setValue(AUTH_EMAILS.USER, { shouldValidate: true });
    passwordField.setValue("123456", { shouldValidate: true });
    setError("");
  };

  return (
    <AuthLayout title="Bienvenido de vuelta" subtitle="Inicia sesión en tu cuenta de VSS">
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

        <BaseInput
          id="password"
          type={showPassword ? "text" : "password"}
          label="Contraseña"
          autoComplete="current-password"
          placeholder="Ingresa tu contraseña"
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

        <div className="flex items-center justify-end">
          <Link to="/auth/recuperar" className="text-sm text-blue-600 hover:text-blue-700">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <BaseButton type="submit" className="h-11 w-full" disabled={isSubmitting} isLoading={isSubmitting}>
          Iniciar sesión
        </BaseButton>

        <p className="text-center text-sm text-gray-600">
          ¿No tienes una cuenta?{" "}
          <Link to="/auth/registro" className="text-blue-600 hover:text-blue-700">
            Crear cuenta
          </Link>
        </p>

        <div className="w-full flex items-center justify-center gap-2">
          <BaseButton
            type="button"
            variant="secondary"
            className="h-9 px-3"
            onClick={fillAdmin}
            disabled={isSubmitting}
          >
            ADMIN
          </BaseButton>
          <BaseButton
            type="button"
            variant="secondary"
            className="h-9 px-3"
            onClick={fillUser}
            disabled={isSubmitting}
          >
            USER
          </BaseButton>
        </div>
      </form>
    </AuthLayout>
  );
}
