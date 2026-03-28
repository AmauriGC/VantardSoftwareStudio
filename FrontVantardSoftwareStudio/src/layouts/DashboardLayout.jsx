import { useState } from "react";
import PropTypes from "prop-types";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Globe,
  Globe2,
  FileText,
  CreditCard,
  User,
  Plus,
  LogOut,
  Shield,
  Menu,
  X,
  Activity,
} from "lucide-react";

import { getAuth, clearAuth } from "../pages/auth/store/authStore";
import { confirmAction } from "../kernel/alerts";
import { AUTH_ROLES } from "../pages/auth/constants/authConstants";

const NAV_ADMIN = [
  { to: "/admin", label: "Panel general", icon: LayoutDashboard, end: true },
  { to: "/admin/planes", label: "Planes", icon: CreditCard },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users },
  { to: "/admin/despliegues", label: "Despliegues", icon: Globe },
  { to: "/admin/logs", label: "Registros", icon: FileText },
];

const NAV_USER = [
  { to: "/user", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/user/perfil", label: "Mi perfil", icon: User },
  { to: "/user/despliegue", label: "Mi despliegue", icon: Globe },
  { to: "/user/nuevo-despliegue", label: "Nuevo despliegue", icon: Plus },
  { to: "/user/trafico", label: "Tráfico", icon: Activity },
  { to: "/user/logs", label: "Registros de acceso", icon: FileText },
  { to: "/user/plan", label: "Mi plan", icon: CreditCard },
];

function SidebarInner({ isAdmin, navItems, auth, onClose, onLogout }) {
  return (
    <>
      {/* Cabecera del sidebar */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-200 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
          <Globe2 className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="text-lg font-bold text-gray-900">VSS</span>
        {isAdmin && (
          <span className="text-[10px] font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
            Admin
          </span>
        )}
        {onClose && (
          <button
            type="button"
            className="ml-auto p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors lg:hidden"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">
          {isAdmin ? "Administración" : "Navegación"}
        </p>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Info de usuario + cerrar sesión */}
      <div className="border-t border-gray-200 p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
            {isAdmin ? (
              <Shield className="h-4 w-4" aria-hidden="true" />
            ) : (
              <span>{auth?.email?.charAt(0)?.toUpperCase() || "U"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {isAdmin ? "Administrador" : "Usuario"}
            </p>
            <p className="text-xs text-gray-500 truncate">{auth?.email || ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

SidebarInner.propTypes = {
  isAdmin: PropTypes.bool.isRequired,
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      to: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      end: PropTypes.bool,
    })
  ).isRequired,
  auth: PropTypes.shape({
    email: PropTypes.string,
  }),
  onClose: PropTypes.func,
  onLogout: PropTypes.func.isRequired,
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const isAdmin = auth?.role === AUTH_ROLES.ADMIN;
  const navItems = isAdmin ? NAV_ADMIN : NAV_USER;

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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar fijo en desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 h-full shrink-0">
        <SidebarInner
          isAdmin={isAdmin}
          navItems={navItems}
          auth={auth}
          onClose={null}
          onLogout={handleLogout}
        />
      </aside>

      {/* Sidebar móvil con overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col lg:hidden">
            <SidebarInner
              isAdmin={isAdmin}
              navItems={navItems}
              auth={auth}
              onClose={() => setSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Encabezado superior */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
          <button
            type="button"
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-5 w-px bg-gray-200 lg:hidden" />
          <div className="flex items-center gap-2 lg:hidden">
            <Globe2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-gray-900">VSS</span>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
