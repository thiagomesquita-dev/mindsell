import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import {
  Users, BarChart3,
  GraduationCap, ShieldAlert, Percent, CalendarDays, TrendingUp, HelpCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { OperatorEvolutionDetail } from "@/components/OperatorEvolutionDetail";
import { AnalysisWeeklyMatrix } from "@/components/AnalysisWeeklyMatrix";
import { TrainingWeeklyMatrix } from "@/components/TrainingWeeklyMatrix";

const MIN_ANALYSES = 3;

interface AnalysisRow {
  id: string;
  operador: string;
  score: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  categoria_erro: string | null;
  categoria_objecao: string | null;
  created_at: string;
  carteira: string;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekSunday(monday: Date): Date {
  const sun = new Date(monday);
  sun.setDate(monday.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function KpiWithTooltip({
  title,
  value,
  icon,
  tooltip,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <KpiCard title={title} value={value} icon={icon} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export default function OperatorEvolution() {
  const { profile } = useAuth();
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const portfolio = usePortfolioFilter();

  const { data: allAnalyses = [], isLoading } = useQuery({
    queryKey: ["evolution-analyses", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("id, operador, score, chance_pagamento, risco_quebra, categoria_erro, categoria_objecao, created_at, carteira")
        .order("created_at", { ascending: true });
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AnalysisRow[];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const { data: dbOperators = [] } = useQuery({
    queryKey: ["operators-evolution", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("operators")
        .select("nome, carteira")
        .eq("status", "ativo")
        .order("nome");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const { data: weeklyReports = [] } = useQuery({
    queryKey: ["weekly-reports", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("weekly_reports")
        .select("*")
        .order("operador", { ascending: true })
        .order("data_inicio_semana", { ascending: true });
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const { data: trainingSessions = [] } = useQuery({
    queryKey: ["training-sessions-matrix", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("training_sessions")
        .select("id, operador, created_at, nota_final, status, origem, carteira")
        .order("created_at", { ascending: true });
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  // Filter by selected carteira
  const filteredAnalyses = useMemo(() => {
    if (portfolio.selected === "Todas") return allAnalyses;
    return allAnalyses.filter(a => a.carteira === portfolio.selected);
  }, [allAnalyses, portfolio.selected]);

  const filteredTrainings = useMemo(() => {
    if (portfolio.selected === "Todas") return trainingSessions;
    return trainingSessions.filter((t: any) => t.carteira === portfolio.selected);
  }, [trainingSessions, portfolio.selected]);

  // All operator names (filtered by carteira)
  const allOperatorNames = useMemo(() => {
    const ops = new Set<string>();
    if (portfolio.selected === "Todas") {
      dbOperators.forEach(op => ops.add(op.nome));
      filteredAnalyses.forEach(a => ops.add(a.operador));
      weeklyReports.forEach((r: any) => ops.add(r.operador));
    } else {
      dbOperators.filter(op => op.carteira === portfolio.selected).forEach(op => ops.add(op.nome));
      filteredAnalyses.forEach(a => ops.add(a.operador));
    }
    return Array.from(ops).sort();
  }, [dbOperators, filteredAnalyses, weeklyReports, portfolio.selected]);

  // Current month analysis KPIs
  const analysisKpis = useMemo(() => {
    const now = new Date();
    const currentMonday = getWeekMonday(now);
    const currentSunday = getWeekSunday(currentMonday);

    const thisWeekAnalyses = filteredAnalyses.filter((a) => {
      const d = new Date(a.created_at);
      return d >= currentMonday && d <= currentSunday;
    });

    const opsWithAnalysis = new Set(thisWeekAnalyses.map((a) => a.operador));
    const withoutAnalysisCount = allOperatorNames.filter((op) => !opsWithAnalysis.has(op)).length;

    const coveragePct = allOperatorNames.length > 0
      ? Math.round((opsWithAnalysis.size / allOperatorNames.length) * 100)
      : 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthAnalyses = filteredAnalyses.filter((a) => {
      const d = new Date(a.created_at);
      return d >= monthStart && d <= monthEnd;
    });
    const avgPerOperator = allOperatorNames.length > 0 && monthAnalyses.length > 0
      ? (monthAnalyses.length / allOperatorNames.length).toFixed(1)
      : "0";

    const monthByOp = new Map<string, number>();
    monthAnalyses.forEach((a) => monthByOp.set(a.operador, (monthByOp.get(a.operador) || 0) + 1));
    const aptCount = Array.from(monthByOp.values()).filter((c) => c >= MIN_ANALYSES).length;

    return {
      withoutAnalysisCount,
      coveragePct,
      totalThisWeek: thisWeekAnalyses.length,
      avgPerOperator,
      aptCount,
    };
  }, [filteredAnalyses, allOperatorNames]);

  const totalOps = allOperatorNames.length;

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title="Evolução do Operador" description="Carregando..." />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="p-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <PageHeader
            title="Evolução do Operador"
            description="Painel gerencial — volume de análises por operador e maturidade da equipe"
          />
          <div className="shrink-0">
            <PortfolioFilter
              carteiras={portfolio.carteiras}
              selected={portfolio.selected}
              onSelect={portfolio.setSelected}
              showAllOption={portfolio.showAllOption}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiWithTooltip
            title="Sem Análise (semana)"
            value={analysisKpis.withoutAnalysisCount}
            icon={<ShieldAlert className="h-5 w-5" />}
            tooltip="Quantidade de operadores que não tiveram nenhuma análise na semana atual."
          />
          <KpiWithTooltip
            title="Cobertura da Equipe"
            value={`${analysisKpis.coveragePct}%`}
            icon={<Percent className="h-5 w-5" />}
            tooltip="Percentual de operadores com pelo menos 1 análise na semana atual."
          />
          <KpiWithTooltip
            title="Análises na Semana"
            value={analysisKpis.totalThisWeek}
            icon={<BarChart3 className="h-5 w-5" />}
            tooltip="Total de análises realizadas na semana atual."
          />
          <KpiWithTooltip
            title="Média por Operador (mês)"
            value={analysisKpis.avgPerOperator}
            icon={<CalendarDays className="h-5 w-5" />}
            tooltip="Média de análises por operador no mês atual."
          />
          <KpiWithTooltip
            title="Aptos para Evolução"
            value={analysisKpis.aptCount}
            icon={<TrendingUp className="h-5 w-5" />}
            tooltip={`Operadores que já atingiram o mínimo de ${MIN_ANALYSES} análises no mês e podem compor o mapa de evolução.`}
          />
        </div>

        {/* PRIMARY: Analysis Weekly Matrix */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Matriz de Análises por Semana
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[320px] text-xs space-y-2">
                <p className="font-semibold">Como funciona a Matriz</p>
                <p>Mostra a quantidade de análises por operador em cada semana do período.</p>
                <p><strong>Cores:</strong></p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><span className="text-destructive font-medium">Vermelho</span> — 0 análises</li>
                  <li><span className="text-yellow-600 dark:text-yellow-400 font-medium">Amarelo</span> — 1–2 análises</li>
                  <li><span className="text-green-600 dark:text-green-400 font-medium">Verde</span> — 3+ análises</li>
                </ul>
                <p>O status <strong>"Apto"</strong> requer no mínimo {MIN_ANALYSES} análises no período.</p>
                <p>Os treinamentos aparecem no detalhe expandido do operador, não na matriz principal.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <AnalysisWeeklyMatrix
            operators={allOperatorNames}
            analyses={filteredAnalyses}
            minAnalyses={MIN_ANALYSES}
            onSelectOperator={(name) => setSelectedOperator(name === selectedOperator ? null : name)}
            selectedOperator={selectedOperator}
            renderExpansion={(operatorName) => (
              <OperatorEvolutionDetail
                operatorName={operatorName}
                analyses={filteredAnalyses}
                weeklyReports={weeklyReports}
                trainingSessions={filteredTrainings}
                onBack={() => setSelectedOperator(null)}
              />
            )}
          />
        </section>

        {/* SECONDARY: Training Weekly Matrix */}
        <section className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Acompanhamento Semanal de Treinamentos
            </h2>
            <Badge variant="secondary" className="text-xs">Complementar</Badge>
          </div>
          <TrainingWeeklyMatrix
            operators={allOperatorNames}
            trainingSessions={filteredTrainings}
            weeksToShow={4}
          />
        </section>

        {totalOps === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum operador encontrado. Realize análises para começar.</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
