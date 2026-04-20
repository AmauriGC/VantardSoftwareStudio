import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import App from "../App.jsx";
import RequireRole from "./RequireRole.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";

import RecoverPasswordPage from "../pages/auth/RecoverPasswordPage.jsx";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage.jsx";
import RegisterPage from "../pages/auth/RegisterPage.jsx";
import AccessDeniedPage from "../pages/errors/AccessDeniedPage.jsx";

// Páginas de admin
import AdminDashboard from "../pages/role/admin/AdminDashboard.jsx";
import AdminUsuarios from "../pages/role/admin/AdminUsuarios.jsx";
import AdminDespliegues from "../pages/role/admin/AdminDespliegues.jsx";
import AdminPlanes from "../pages/role/admin/AdminPlanes.jsx";
import AdminLogs from "../pages/role/admin/AdminLogs.jsx";

// Páginas de usuario
import UserDashboard from "../pages/role/user/UserDashboard.jsx";
import UserPerfil from "../pages/role/user/UserPerfil.jsx";
import UserDespliegue from "../pages/role/user/UserDespliegue.jsx";
import UserNuevoDespliegue from "../pages/role/user/UserNuevoDespliegue.jsx";
import UserTrafico from "../pages/role/user/UserTrafico.jsx";
import UserLogs from "../pages/role/user/UserLogs.jsx";
import UserPlan from "../pages/role/user/UserPlan.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Página de login */}
        <Route path="/" element={<App />} />

        {/* Auth públicas */}
        <Route path="/auth/recuperar" element={<RecoverPasswordPage />} />
        <Route path="/auth/restablecer" element={<ResetPasswordPage />} />
        <Route path="/auth/registro" element={<RegisterPage />} />

        {/* Error */}
        <Route path="/403" element={<AccessDeniedPage />} />

        {/* Rutas de admin protegidas */}
        <Route element={<RequireRole allowedRoles={["admin"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/despliegues" element={<AdminDespliegues />} />
            <Route path="/admin/planes" element={<AdminPlanes />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
          </Route>
        </Route>

        {/* Rutas de usuario protegidas */}
        <Route element={<RequireRole allowedRoles={["user"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/user" element={<UserDashboard />} />
            <Route path="/user/perfil" element={<UserPerfil />} />
            <Route path="/user/despliegue" element={<UserDespliegue />} />
            <Route path="/user/nuevo-despliegue" element={<UserNuevoDespliegue />} />
            <Route path="/user/trafico" element={<UserTrafico />} />
            <Route path="/user/logs" element={<UserLogs />} />
            <Route path="/user/plan" element={<UserPlan />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
