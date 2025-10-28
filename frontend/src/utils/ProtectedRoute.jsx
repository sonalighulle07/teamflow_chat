import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ isAuthenticated, children }) {
  const location = useLocation();

  if (!isAuthenticated) {
    // Only pass the pathname, not the full location object
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

