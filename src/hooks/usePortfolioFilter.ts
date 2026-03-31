import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

export function usePortfolioFilter(initialCarteira?: string) {
  const { profile, user } = useAuth();
  const { isCoordination, isLoading: rolesLoading } = useUserRole();
  const { isFounder, getEmpresaFilter } = useCompanyFilter();
  const [selected, setSelected] = useState(initialCarteira || "Todas");

  const empresaFilter = getEmpresaFilter();

  // For coordination/founder: fetch all company carteiras
  const { data: companyCarteiras = [] } = useQuery({
    queryKey: ["company-carteiras-names", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("company_carteiras")
        .select("nome")
        .eq("status", "ativo")
        .order("nome");

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      // If founder with no filter (all companies), RLS allows all rows

      const { data, error } = await query;
      if (error) throw error;
      return data.map((c) => c.nome);
    },
    enabled: (isFounder || !!profile?.empresa_id) && (isCoordination || isFounder) && !rolesLoading,
  });

  // For supervisors: fetch only their portfolios
  const { data: userCarteiras = [] } = useQuery({
    queryKey: ["user-carteiras", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_portfolios")
        .select("carteira")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((p) => p.carteira);
    },
    enabled: !!user?.id && !isCoordination && !isFounder && !rolesLoading,
  });

  const carteiras = (isCoordination || isFounder) ? companyCarteiras : userCarteiras;
  const showAllOption = isCoordination || isFounder;

  // Build filter function for analyses
  const filterByCarteira = <T extends { carteira: string }>(items: T[]): T[] => {
    if (selected === "Todas") return items;
    return items.filter((item) => item.carteira === selected);
  };

  return {
    carteiras,
    selected,
    setSelected,
    showAllOption,
    filterByCarteira,
    isLoading: rolesLoading,
  };
}
