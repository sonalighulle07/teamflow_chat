import { Navigate } from "react-router-dom";

export default function SecureRoutes({ isAuthenticated, role, allowedRoles, children }) {
  // Check login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role permission
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
