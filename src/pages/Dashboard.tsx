import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { OperatorFilter } from "@/components/OperatorFilter";
import { DashboardChart } from "@/components/DashboardChart";
import { DiagnosticoIA } from "@/components/DiagnosticoIA";
import { AidaHeatmap } from "@/components/AidaHeatmap";
import { FinancialMetrics } from "@/components/FinancialMetrics";
import { metricExplanations } from "@/lib/metricExplanations";
import { Activity, TrendingUp, Target, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";


const PRIMARY = "hsl(var(--primary))";
const DESTRUCTIVE = "hsl(var(--destructive))";
const ACCENT = "#2563EB";

function extractShortLabel(text: string): string {
  const label = text.split(/\s*[—–-]\s/)[0].trim();
  return label.replace(/\b\w/g, (c) => c.toUpperCase());
}

function aggregate(items: (string | null)[]): { name: string; value: number }[] {
  const counts: Record<string, number> = {};
  items.forEach((item) => {
    if (item) counts[item] = (counts[item] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function aggregateTechniques(items: (string | null)[]): { shortName: string; fullDescription: string; value: number }[] {
  const counts: Record<string, { full: string; count: number }> = {};
  items.forEach((item) => {
    if (!item) return;
    const short = extractShortLabel(item);
    if (counts[short]) {
      counts[short].count += 1;
    } else {
      counts[short] = { full: item, count: 1 };
    }
  });
  return Object.entries(counts)
    .map(([shortName, { full, count }]) => ({ shortName, fullDescription: full, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export default function Dashboard() {
  const { profile } = useAuth();
  const portfolio = usePortfolioFilter();
  const { filterByDate } = useDateFilter();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const [selectedOperator, setSelectedOperator] = useState("Todos");

  // Reset operator when carteira changes
  useEffect(() => {
    setSelectedOperator("Todos");
  }, [portfolio.selected]);

  const empresaFilter = getEmpresaFilter();

  const { data: allAnalyses = [] } = useQuery({
    queryKey: ["dashboard", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("score, chance_pagamento, risco_quebra, categoria_objecao, categoria_erro, tecnica_usada, carteira, operador, aida_atencao, aida_interesse, aida_desejo, aida_acao, created_at, intencao_cliente, capacidade_percebida, firmeza_compromisso")
        .order("created_at", { ascending: false });
      
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      // When empresaFilter is null and isFounder, no empresa_id filter = all companies (RLS allows it)
      // When not founder, RLS naturally restricts to own company
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  // Fetch carteira financial data for the selected portfolio
  const { data: carteirasFinancial = [] } = useQuery({
    queryKey: ["carteiras-financial", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("company_carteiras")
        .select("nome, comissao_recebida_periodo, quantidade_pagamentos_periodo, periodo_referencia")
        .eq("status", "ativo");
      
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as { nome: string; comissao_recebida_periodo: number | null; quantidade_pagamentos_periodo: number | null; periodo_referencia: string | null }[];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const filteredByCarteira = filterByDate(portfolio.filterByCarteira(allAnalyses));
  const analyses = selectedOperator === "Todos"
    ? filteredByCarteira
    : filteredByCarteira.filter((a) => a.operador === selectedOperator);

  const isOperatorFiltered = selectedOperator !== "Todos";

  // Week boundaries for AIDA comparison
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);

  const currentWeekAnalyses = analyses.filter((a) => new Date(a.created_at) >= currentWeekStart);
  const previousWeekAnalyses = analyses.filter((a) => {
    const d = new Date(a.created_at);
    return d >= previousWeekStart && d < currentWeekStart;
  });

  const totalAnalyses = analyses.length;
  const avgScoreNum = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / analyses.length
    : 0;
  const avgScore = avgScoreNum > 0 ? avgScoreNum.toFixed(1) : "—";
  const avgPayment = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + (Number(a.chance_pagamento) || 0), 0) / analyses.length) + "%"
    : "—";
  const avgRisk = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + (Number(a.risco_quebra) || 0), 0) / analyses.length) + "%"
    : "—";


  const objections = aggregate(analyses.map((a) => a.categoria_objecao));
  const errors = aggregate(analyses.map((a) => a.categoria_erro));
  const techniques = aggregateTechniques(analyses.map((a) => a.tecnica_usada));


  // Find financial data for selected carteira
  const selectedCarteiraFinancial = portfolio.selected !== "Todas"
    ? carteirasFinancial.find((c) => c.nome === portfolio.selected) || null
    : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={isOperatorFiltered
          ? `Visão individual de ${selectedOperator} filtrada no dashboard`
          : "Central de inteligência da operação"
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <PortfolioFilter
          carteiras={portfolio.carteiras}
          selected={portfolio.selected}
          onSelect={portfolio.setSelected}
          showAllOption={portfolio.showAllOption}
        />
        <OperatorFilter
          carteira={portfolio.selected}
          selected={selectedOperator}
          onSelect={setSelectedOperator}
        />
      </div>
      {/* ── 1. Visão Geral da Operação ── */}
      <section className="mb-10">
        <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          {isOperatorFiltered ? `Visão Individual — ${selectedOperator}` : "Visão Geral da Operação"}
        </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <KpiCard title="Negociações Analisadas" value={totalAnalyses.toLocaleString("pt-BR")} icon={<Activity className="h-5 w-5" />} />
          <KpiCard
            title="Qualidade Média das Negociações"
            value={avgScore}
            icon={<TrendingUp className="h-5 w-5" />}
            tooltip={metricExplanations.qualidadeMedia.tooltip}
            modalData={metricExplanations.qualidadeMedia}
          />
          <KpiCard
            title="Chance Média de Pagamento"
            value={avgPayment}
            icon={<Target className="h-5 w-5" />}
            tooltip={metricExplanations.chancePagamento.tooltip}
            modalData={metricExplanations.chancePagamento}
          />
          <KpiCard
            title="Risco Médio de Quebra"
            value={avgRisk}
            icon={<AlertTriangle className="h-5 w-5" />}
            tooltip={metricExplanations.riscoQuebra.tooltip}
            modalData={metricExplanations.riscoQuebra}
          />
        </div>

      </section>

      {/* ── Métricas Financeiras da Carteira ── */}
      <FinancialMetrics carteira={selectedCarteiraFinancial} avgScore={avgScoreNum} />

      {analyses.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Nenhuma análise registrada ainda. Comece criando uma nova análise.</p>
        </div>
      ) : (
        <>
          {/* ── 2. Mapa da Negociação (AIDA) ── */}
          <section className="mb-10">
            <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Mapa da Negociação da Operação (AIDA)
            </h2>
            <p className="text-sm text-muted-foreground font-body mb-4">
              Identifica em qual etapa da negociação a equipe está performando melhor ou pior.
            </p>
            <AidaHeatmap analyses={analyses} previousWeekAnalyses={previousWeekAnalyses} />
          </section>

          {/* ── 3. Principais Barreiras dos Clientes ── */}
          {objections.length > 0 && (
            <section className="mb-10">
              <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Principais Barreiras dos Clientes
              </h2>
              <DashboardChart
                title="Principais Barreiras dos Clientes"
                data={objections}
                color={PRIMARY}
                chartType="objection"
              />
            </section>
          )}

          {/* ── 3. Principais Falhas da Operação ── */}
          {errors.length > 0 && (
            <section className="mb-10">
              <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Principais Falhas da Operação
              </h2>
              <DashboardChart
                title="Principais Falhas da Operação"
                data={errors}
                color={DESTRUCTIVE}
                chartType="error"
              />
            </section>
          )}

          {/* ── 4. Como a Equipe Está Conduzindo as Negociações ── */}
          {techniques.length > 0 && (
            <section className="mb-10">
              <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Como a Equipe Está Conduzindo as Negociações
              </h2>
              <DashboardChart
                title="Como a Equipe Está Conduzindo as Negociações"
                data={techniques}
                dataKey="shortName"
                color={ACCENT}
                chartType="technique"
              />
            </section>
          )}

          {/* ── 5. Diagnóstico da Operação (IA) ── */}
          <section className="mb-10">
            <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Diagnóstico da Operação (IA)
            </h2>
            <DiagnosticoIA analyses={analyses} />
          </section>
        </>
      )}
    </div>
  );
}
