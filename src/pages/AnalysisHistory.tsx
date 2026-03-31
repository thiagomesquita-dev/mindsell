import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

export default function AnalysisHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [operatorFilter, setOperatorFilter] = useState(searchParams.get("operador") || "Todos");
  const [canalFilter, setCanalFilter] = useState(searchParams.get("canal") || "Todos");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const portfolio = usePortfolioFilter(searchParams.get("carteira") || undefined);
  const { filterByDate } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();

  const { data: allAnalyses = [] } = useQuery({
    queryKey: ["analyses-history", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("id, created_at, operador, carteira, canal, score, chance_pagamento, risco_quebra, conformidade")
        .order("created_at", { ascending: false });
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  // Filter by carteira first
  const carteiraFiltered = filterByDate(portfolio.filterByCarteira(allAnalyses));

  // Derive operators from the carteira-filtered set
  const operators = useMemo(() => {
    const unique = [...new Set(carteiraFiltered.map((a) => a.operador))];
    return unique.sort();
  }, [carteiraFiltered]);

  // Reset operator filter when carteira changes and operator is no longer available
  const effectiveOperator = operators.includes(operatorFilter) ? operatorFilter : "Todos";

  // Sync filters to URL
  const updateParams = useCallback((carteira: string, operador: string, canal: string) => {
    const params = new URLSearchParams();
    if (carteira !== "Todas") params.set("carteira", carteira);
    if (operador !== "Todos") params.set("operador", operador);
    if (canal !== "Todos") params.set("canal", canal);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleCarteiraChange = useCallback((v: string) => {
    portfolio.setSelected(v);
    setOperatorFilter("Todos");
    updateParams(v, "Todos", canalFilter);
  }, [canalFilter, updateParams, portfolio]);

  const handleOperatorChange = useCallback((v: string) => {
    setOperatorFilter(v);
    updateParams(portfolio.selected, v, canalFilter);
  }, [portfolio.selected, canalFilter, updateParams]);

  const handleCanalChange = useCallback((v: string) => {
    setCanalFilter(v);
    updateParams(portfolio.selected, effectiveOperator, v);
  }, [portfolio.selected, effectiveOperator, updateParams]);

  const currentFilterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (portfolio.selected !== "Todas") params.set("carteira", portfolio.selected);
    if (effectiveOperator !== "Todos") params.set("operador", effectiveOperator);
    if (canalFilter !== "Todos") params.set("canal", canalFilter);
    return params.toString();
  }, [portfolio.selected, effectiveOperator, canalFilter]);

  const filtered = carteiraFiltered.filter((d) => {
    if (effectiveOperator !== "Todos" && d.operador !== effectiveOperator) return false;
    if (canalFilter === "Ligação" && d.canal !== "call") return false;
    if (canalFilter === "WhatsApp" && d.canal !== "whatsapp") return false;
    return true;
  });

  return (
    <div>
      <PageHeader title="Histórico de Análises" description="Navegue por todas as análises de negociação realizadas" />

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <PortfolioFilter
            carteiras={portfolio.carteiras}
            selected={portfolio.selected}
            onSelect={handleCarteiraChange}
            showAllOption={portfolio.showAllOption}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Operador:</span>
            <Select value={effectiveOperator} onValueChange={handleOperatorChange}>
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Canal:</span>
            <Select value={canalFilter} onValueChange={handleCanalChange}>
              <SelectTrigger className="w-40 bg-secondary border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="Todos" className="text-sm">Todos</SelectItem>
                <SelectItem value="Ligação" className="text-sm">Ligação</SelectItem>
                <SelectItem value="WhatsApp" className="text-sm">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border">
              {["Data", "Operador", "Carteira", "Canal", "Qualidade", "Chance de Pagamento", "Risco Quebra", "Compliance", "Ações"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhuma análise encontrada</td></tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-foreground">{row.operador}</td>
                  <td className="px-4 py-3 text-foreground">{row.carteira}</td>
                  <td className="px-4 py-3 text-foreground">{row.canal === "call" ? "Ligação" : row.canal === "whatsapp" ? "WhatsApp" : row.canal}</td>
                  <td className="px-4 py-3 font-heading font-bold text-primary">{row.score ?? "—"}</td>
                  <td className="px-4 py-3 font-heading font-bold text-success">{row.chance_pagamento != null ? `${row.chance_pagamento}%` : "—"}</td>
                  <td className="px-4 py-3 font-heading font-bold text-destructive">{row.risco_quebra != null ? `${row.risco_quebra}%` : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={`border-0 font-body text-xs ${
                      row.conformidade === "Conforme" ? "bg-success/20 text-success" :
                      row.conformidade === "Parcialmente Conforme" ? "bg-warning/20 text-warning" :
                      row.conformidade === "Não Conforme" ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {row.conformidade || "Pendente"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/analysis-result/${row.id}${currentFilterParams ? `?returnTo=${encodeURIComponent(`/analysis-history?${currentFilterParams}`)}` : ''}`)} className="text-muted-foreground hover:text-primary">
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
