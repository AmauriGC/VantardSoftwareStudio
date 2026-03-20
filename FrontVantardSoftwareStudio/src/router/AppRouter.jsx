import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import App from "../App.jsx";
import RequireRole from "./RequireRole.jsx";
import RecoverPasswordPage from "../pages/auth/RecoverPasswordPage.jsx";
import RegisterPage from "../pages/auth/RegisterPage.jsx";
import AdminPage from "../pages/role/admin/AdminPage.jsx";
import UserPage from "../pages/role/user/UserPage.jsx";
import AccessDeniedPage from "../pages/errors/AccessDeniedPage.jsx";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />

        <Route path="/auth/recuperar" element={<RecoverPasswordPage />} />
        <Route path="/auth/registro" element={<RegisterPage />} />

        <Route path="/403" element={<AccessDeniedPage />} />

        <Route element={<RequireRole allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route element={<RequireRole allowedRoles={["user"]} />}>
          <Route path="/user" element={<UserPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
