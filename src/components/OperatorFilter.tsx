import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { useAuth } from "@/contexts/AuthContext";

interface OperatorFilterProps {
  carteira: string;
  selected: string;
  onSelect: (value: string) => void;
}

export function OperatorFilter({ carteira, selected, onSelect }: OperatorFilterProps) {
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const { profile } = useAuth();
  const empresaFilter = getEmpresaFilter();

  const { data: operators = [] } = useQuery({
    queryKey: ["dashboard-operators", empresaFilter, isFounder, carteira],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("operador");

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }

      if (carteira !== "Todas") {
        query = query.eq("carteira", carteira);
      }

      const { data, error } = await query;
      if (error) throw error;

      const unique = [...new Set((data || []).map((d) => d.operador))].sort();
      return unique;
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Operador:</span>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger className="w-52 bg-secondary border-border text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          <SelectItem value="Todos" className="text-sm">Todos</SelectItem>
          {operators.map((op) => (
            <SelectItem key={op} value={op} className="text-sm">{op}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
