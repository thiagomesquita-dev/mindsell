import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizePlan,
  isModuleAvailable,
  type ModuleId,
  FOUNDER_ONLY_MODULES,
  type FounderModuleId,
} from "@/lib/planPermissions";

export function useCompanyPlan() {
  const { profile } = useAuth();
  const { getEmpresaFilter } = useCompanyFilter();
  const { isFounder } = useUserRole();

  const empresaId = getEmpresaFilter() || profile?.empresa_id;

  const { data: companyPlan, isLoading } = useQuery({
    queryKey: ["company-plan", empresaId],
    queryFn: async () => {
      if (!empresaId) return "free";
      const { data, error } = await supabase.from("companies").select("plano").eq("id", empresaId).maybeSingle();
      if (error) throw error;
      return data?.plano ?? "free";
    },
    enabled: !!empresaId,
    staleTime: 60_000,
  });

  const plan = normalizePlan(companyPlan);

  const canAccessModule = (moduleId: ModuleId | FounderModuleId): boolean => {
    // Founder can access everything
    if (isFounder) return true;

    // Founder-only modules are blocked for everyone else
    if ((FOUNDER_ONLY_MODULES as readonly string[]).includes(moduleId)) return false;

    return isModuleAvailable(plan, moduleId as ModuleId);
  };

  return {
    plan,
    isLoading,
    isFounder,
    canAccessModule,
  };
}
