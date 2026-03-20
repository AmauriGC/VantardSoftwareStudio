import { useNavigate } from "react-router-dom";

import { clearAuth } from "../../auth/store/authStore";
import { confirmAction } from "../../../kernel/alerts";

export default function AdminPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: "Cerrar sesión",
      text: "¿Quieres cerrar sesión ahora?",
      confirmText: "Cerrar sesión",
      cancelText: "Cancelar",
    });

    if (!ok) return;
    clearAuth();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Admin</h1>
        <p className="text-gray-600 text-center">Panel de administración (placeholder).</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
