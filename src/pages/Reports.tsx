import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { Trophy, AlertTriangle, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

export default function Reports() {
  const { profile } = useAuth();
  const portfolio = usePortfolioFilter();
  const { filterByDate, label: periodLabel } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();

  const { data } = useQuery({
    queryKey: ["reports", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("operador, score, chance_pagamento, risco_quebra, objecao, erro_principal, carteira, created_at")
        .order("created_at", { ascending: false });
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data: analyses, error } = await query;
      if (error) throw error;
      return analyses || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const allItems = filterByDate(data || []);
  const items = portfolio.filterByCarteira(allItems);
  const total = items.length;

  // Errors
  const errorCounts: Record<string, number> = {};
  items.forEach((a) => { if (a.erro_principal) errorCounts[a.erro_principal] = (errorCounts[a.erro_principal] || 0) + 1; });
  const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Objections
  const objCounts: Record<string, number> = {};
  items.forEach((a) => { if (a.objecao) objCounts[a.objecao] = (objCounts[a.objecao] || 0) + 1; });
  const topObjections = Object.entries(objCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Best operator
  const opMap: Record<string, { scores: number[]; payments: number[]; risks: number[] }> = {};
  items.forEach((a) => {
    if (!opMap[a.operador]) opMap[a.operador] = { scores: [], payments: [], risks: [] };
    if (a.score != null) opMap[a.operador].scores.push(Number(a.score));
    if (a.chance_pagamento != null) opMap[a.operador].payments.push(Number(a.chance_pagamento));
    if (a.risco_quebra != null) opMap[a.operador].risks.push(Number(a.risco_quebra));
  });

  let bestOperator: { name: string; avgScore: number; avgPayment: number; avgRisk: number } | null = null;
  let bestScore = -1;
  Object.entries(opMap).forEach(([name, v]) => {
    const avg = v.scores.length ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length : 0;
    if (avg > bestScore) {
      bestScore = avg;
      bestOperator = {
        name,
        avgScore: +avg.toFixed(1),
        avgPayment: v.payments.length ? Math.round(v.payments.reduce((a, b) => a + b, 0) / v.payments.length) : 0,
        avgRisk: v.risks.length ? Math.round(v.risks.reduce((a, b) => a + b, 0) / v.risks.length) : 0,
      };
    }
  });

  return (
    <div>
      <PageHeader title="Relatórios" description={`Resumo operacional • ${periodLabel} • ${total} análises`} />

      <div className="mb-6">
        <PortfolioFilter
          carteiras={portfolio.carteiras}
          selected={portfolio.selected}
          onSelect={portfolio.setSelected}
          showAllOption={portfolio.showAllOption}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Erros Mais Comuns da Equipe</h2>
          </div>
          {topErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum erro registrado nesta semana.</p>
          ) : (
            <ul className="space-y-4">
              {topErrors.map(([error, count], i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xs font-heading font-bold text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm text-foreground/90 font-body leading-relaxed">{error} ({count}x)</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Objeções Mais Comuns</h2>
          </div>
          {topObjections.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma objeção registrada nesta semana.</p>
          ) : (
            <ul className="space-y-4">
              {topObjections.map(([obj, count], i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xs font-heading font-bold text-muted-foreground mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm text-foreground/90 font-body leading-relaxed">"{obj}" — {count} ocorrências</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Melhor Operador da Semana</h2>
          </div>
          {bestOperator ? (
            <div className="flex flex-col items-center text-center py-8">
              <div className="w-20 h-20 bg-primary/10 border-2 border-primary rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground">{bestOperator.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 font-body">Melhor desempenho esta semana</p>
              <div className="grid grid-cols-3 gap-4 mt-6 w-full">
                <div>
                  <p className="text-xs text-muted-foreground">Qualidade</p>
                  <p className="text-lg font-heading font-bold text-primary">{bestOperator.avgScore}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <p className="text-lg font-heading font-bold text-success">{bestOperator.avgPayment}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risco</p>
                  <p className="text-lg font-heading font-bold text-destructive">{bestOperator.avgRisk}%</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível esta semana.</p>
          )}
        </div>

      </div>
    </div>
  );
}
