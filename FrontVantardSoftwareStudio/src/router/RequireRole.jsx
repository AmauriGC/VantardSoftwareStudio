import PropTypes from "prop-types";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getRole } from "../pages/auth/store/authStore";

export default function RequireRole({ allowedRoles }) {
  const location = useLocation();
  const role = getRole();

  if (!role) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

RequireRole.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
};
