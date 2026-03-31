import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";
const STORAGE_KEY = "cobramind-company-filter";

interface Company {
  id: string;
  nome_empresa: string;
}

interface CompanyFilterContextType {
  isFounder: boolean;
  /** True if user has memberships in 2+ companies */
  isMultiCompany: boolean;
  companies: Company[];
  selectedCompanyId: string | null; // null = "Todas" (founder only)
  setSelectedCompanyId: (id: string | null) => void;
  /** Returns the empresa_id to use in queries. */
  getEmpresaFilter: () => string | null;
  isLoading: boolean;
}

const CompanyFilterContext = createContext<CompanyFilterContextType>({
  isFounder: false,
  isMultiCompany: false,
  companies: [],
  selectedCompanyId: null,
  setSelectedCompanyId: () => {},
  getEmpresaFilter: () => null,
  isLoading: false,
});

export function CompanyFilterProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const isFounder = user?.email === FOUNDER_EMAIL;

  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  const setSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Founder: load ALL companies
  const { data: allCompanies = [], isLoading: loadingAll } = useQuery({
    queryKey: ["all-companies-founder"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, nome_empresa")
        .order("nome_empresa");
      if (error) throw error;
      return data as Company[];
    },
    enabled: isFounder,
  });

  // Non-founder: load user's company_memberships
  const { data: userMemberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ["user-company-memberships", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_memberships")
        .select("company_id, companies:company_id(id, nome_empresa)")
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.companies?.id || m.company_id,
        nome_empresa: m.companies?.nome_empresa || "",
      })) as Company[];
    },
    enabled: !isFounder && !!user?.id,
  });

  const isMultiCompany = !isFounder && userMemberships.length > 1;
  const companies = isFounder ? allCompanies : userMemberships;
  const isLoading = isFounder ? loadingAll : loadingMemberships;

  // For multi-company users without a selection, default to their profile empresa_id
  const effectiveSelectedId = selectedCompanyId || (isMultiCompany ? profile?.empresa_id || null : null);

  const getEmpresaFilter = (): string | null => {
    if (isFounder) return selectedCompanyId; // null means "all"
    if (isMultiCompany) return effectiveSelectedId;
    return profile?.empresa_id || null;
  };

  return (
    <CompanyFilterContext.Provider
      value={{
        isFounder,
        isMultiCompany,
        companies,
        selectedCompanyId: isFounder ? selectedCompanyId : effectiveSelectedId,
        setSelectedCompanyId,
        getEmpresaFilter,
        isLoading,
      }}
    >
      {children}
    </CompanyFilterContext.Provider>
  );
}

export const useCompanyFilter = () => useContext(CompanyFilterContext);
