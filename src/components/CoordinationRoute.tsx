import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";

/** Allows access to founder + coordination (admin/gestor) roles */
export function CoordinationRoute({ children }: { children: React.ReactNode }) {
  const { isCoordination, isFounderEmail, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isCoordination && !isFounderEmail) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
