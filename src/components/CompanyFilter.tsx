import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function CompanyFilter() {
  const { isFounder, isMultiCompany, companies, selectedCompanyId, setSelectedCompanyId } = useCompanyFilter();

  // Show for founder (with "Todas" option) or multi-company users (no "Todas")
  if (!isFounder && !isMultiCompany) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-primary shrink-0" />
      <Select
        value={selectedCompanyId || (isFounder ? "__all__" : "")}
        onValueChange={(v) => setSelectedCompanyId(v === "__all__" ? null : v)}
      >
        <SelectTrigger className="w-52 h-8 bg-secondary border-border text-xs">
          <SelectValue placeholder={isFounder ? "Todas as empresas" : "Selecione a empresa"} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {isFounder && (
            <SelectItem value="__all__" className="text-xs font-medium">
              Todas as empresas
            </SelectItem>
          )}
          {companies.map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {c.nome_empresa}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
