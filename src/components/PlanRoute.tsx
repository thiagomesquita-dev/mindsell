import { Navigate } from "react-router-dom";
import { useCompanyPlan } from "@/hooks/useCompanyPlan";
import type { ModuleId, FounderModuleId } from "@/lib/planPermissions";

interface PlanRouteProps {
  moduleId: ModuleId | FounderModuleId;
  children: React.ReactNode;
}

/**
 * Route guard that blocks access to modules not included in the user's plan.
 * Redirects to dashboard if the module is not available.
 */
export function PlanRoute({ moduleId, children }: PlanRouteProps) {
  const { canAccessModule, isLoading } = useCompanyPlan();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canAccessModule(moduleId)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
