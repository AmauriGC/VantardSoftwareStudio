import { useNavigate } from "react-router-dom";

import BaseButton from "../../components/BaseButton";
import BaseCard from "../../components/BaseCard";

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
      <BaseCard className="w-full max-w-lg p-8 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Acceso denegado</h1>
        <p className="text-gray-600 text-center">
          No tienes permisos para ver esta pantalla. Si crees que es un error, inicia sesión con
          otra cuenta o contacta a un administrador.
        </p>

        <div className="w-full flex items-center justify-center gap-2 pt-2">
          <BaseButton variant="secondary" onClick={() => navigate(-1)} className="h-10 px-4">
            Volver
          </BaseButton>
          <BaseButton onClick={() => navigate("/", { replace: true })} className="h-10 px-4">
            Ir al login
          </BaseButton>
        </div>
      </BaseCard>
    </div>
  );
}
