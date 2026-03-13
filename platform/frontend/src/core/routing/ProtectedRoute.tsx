import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthSession } from "../auth/auth-session";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const session = useAuthSession();
  const location = useLocation();

  if (!session.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && session.role !== "Admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
