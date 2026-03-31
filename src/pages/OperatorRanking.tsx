import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { Trophy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

interface OperatorStats {
  operator: string;
  count: number;
  avgScore: number;
  avgPayment: number;
  avgRisk: number;
}

const medals = ["text-primary", "text-muted-foreground", "text-destructive/60"];

export default function OperatorRanking() {
  const { profile } = useAuth();
  const portfolio = usePortfolioFilter();
  const { filterByDate } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();

  const { data: allAnalyses = [] } = useQuery({
    queryKey: ["operator-ranking", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("operador, score, chance_pagamento, risco_quebra, carteira, created_at");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const analyses = filterByDate(portfolio.filterByCarteira(allAnalyses));

  const ranking = (() => {
    const map: Record<string, { scores: number[]; payments: number[]; risks: number[] }> = {};
    analyses.forEach((a) => {
      if (!map[a.operador]) map[a.operador] = { scores: [], payments: [], risks: [] };
      if (a.score != null) map[a.operador].scores.push(Number(a.score));
      if (a.chance_pagamento != null) map[a.operador].payments.push(Number(a.chance_pagamento));
      if (a.risco_quebra != null) map[a.operador].risks.push(Number(a.risco_quebra));
    });

    const stats: OperatorStats[] = Object.entries(map).map(([operator, v]) => ({
      operator,
      count: v.scores.length || v.payments.length || v.risks.length,
      avgScore: v.scores.length ? +(v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(1) : 0,
      avgPayment: v.payments.length ? Math.round(v.payments.reduce((a, b) => a + b, 0) / v.payments.length) : 0,
      avgRisk: v.risks.length ? Math.round(v.risks.reduce((a, b) => a + b, 0) / v.risks.length) : 0,
    }));

    return stats.sort((a, b) => b.avgScore - a.avgScore);
  })();

  return (
    <div>
      <PageHeader title="Ranking de Operadores" description="Classificação de desempenho dos operadores" />

      <div className="mb-6">
        <PortfolioFilter
          carteiras={portfolio.carteiras}
          selected={portfolio.selected}
          onSelect={portfolio.setSelected}
          showAllOption={portfolio.showAllOption}
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b border-border">
              {["#", "Operador", "Análises", "Qualidade Média", "Chance Média de Pagamento", "Risco Médio de Quebra"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum dado disponível</td></tr>
            ) : (
              ranking.map((row, i) => (
                <tr key={row.operator} className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    {i < 3 ? <Trophy className={`h-5 w-5 ${medals[i]}`} /> : <span className="text-muted-foreground font-heading font-bold">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">{row.operator}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.count}</td>
                  <td className="px-4 py-3 font-heading font-bold text-primary">{row.avgScore}</td>
                  <td className="px-4 py-3 font-heading font-bold text-success">{row.avgPayment}%</td>
                  <td className="px-4 py-3 font-heading font-bold text-destructive">{row.avgRisk}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
