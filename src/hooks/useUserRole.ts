import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FOUNDER_EMAIL = "thiago@thiagoanalytics.com.br";

export function useUserRole() {
  const { user } = useAuth();

  // Global roles from user_roles table
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    enabled: !!user?.id,
  });

  // Membership roles from company_memberships
  const { data: membershipRoles = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ["user-membership-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("company_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data.map((r) => r.role);
    },
    enabled: !!user?.id,
  });

  const allRoles = [...new Set([...roles, ...membershipRoles])];

  const isAdmin = allRoles.includes("admin");
  const isGestor = allRoles.includes("gestor");
  const isFounder = allRoles.includes("founder");
  const isFounderEmail = user?.email === FOUNDER_EMAIL;

  return {
    roles: allRoles,
    isAdmin,
    isGestor,
    isFounder,
    isFounderEmail,
    isCoordination: isAdmin || isGestor,
    isLoading: rolesLoading || membershipsLoading,
  };
}
