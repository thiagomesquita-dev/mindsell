import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";

export function FounderRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user?.email !== FOUNDER_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
