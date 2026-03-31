import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { useDateFilter } from "@/contexts/DateFilterContext";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Target, TrendingUp, ShieldAlert, BarChart3, ArrowUp, ArrowDown, Minus, Brain, Loader2, ChevronDown, AlertTriangle } from "lucide-react";
import { EnrichedBarTooltip } from "@/components/EnrichedBarTooltip";
import { subDays } from "date-fns";

const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";
const DESTRUCTIVE = "hsl(var(--destructive))";

function RadarTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const atual = payload.find((p: any) => p.dataKey === "atual")?.value ?? 0;
  const anterior = payload.find((p: any) => p.dataKey === "anterior")?.value ?? null;
  const delta = anterior !== null ? atual - anterior : null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-foreground">Atual: <span className="font-mono font-bold">{atual}/10</span></p>
      {anterior !== null && (
        <>
          <p className="text-muted-foreground">Anterior: <span className="font-mono">{anterior}/10</span></p>
          <p className={`font-medium mt-0.5 ${delta! > 0 ? "text-emerald-600" : delta! < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            Δ {delta! > 0 ? "+" : ""}{delta}
          </p>
        </>
      )}
    </div>
  );
}

function extractNota(val: unknown): number | null {
  if (!val || typeof val !== "object") return null;
  const obj = val as Record<string, unknown>;
  return typeof obj.nota === "number" ? obj.nota : null;
}

function avg(nums: (number | null)[]): number {
  const valid = nums.filter((n): n is number => n !== null);
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
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

function getPeriodRange(period: string): { currentStart: Date; currentEnd: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  let days: number;
  switch (period) {
    case "7d": days = 7; break;
    case "15d": days = 15; break;
    case "30d": days = 30; break;
    case "90d": days = 90; break;
    default: days = 7;
  }
  const currentStart = subDays(now, days);
  const prevStart = subDays(currentStart, days);
  return { currentStart, currentEnd: now, prevStart, prevEnd: currentStart };
}

type AnalysisRow = {
  carteira: string;
  operador: string;
  score: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  aida_atencao: unknown;
  aida_interesse: unknown;
  aida_desejo: unknown;
  aida_objecao: unknown;
  aida_acao: unknown;
  categoria_erro: string | null;
  categoria_objecao: string | null;
  conformidade: string | null;
  nota_qa: number | null;
  created_at: string;
};

function computeRadarMetrics(items: AnalysisRow[]) {
  const atencao = avg(items.map((a) => extractNota(a.aida_atencao)));
  const interesse = avg(items.map((a) => extractNota(a.aida_interesse)));
  const desejo = avg(items.map((a) => extractNota(a.aida_desejo)));
  const acao = avg(items.map((a) => extractNota(a.aida_acao)));
  const investigacao = avg(items.map((a) => a.nota_qa));
  const fechamento = avg(items.map((a) => a.chance_pagamento));
  const conformes = items.filter((a) => a.conformidade === "Conforme").length;
  const conformidade = items.length ? Math.round((conformes / items.length) * 100) : 0;
  return { atencao, interesse, desejo, acao, investigacao, fechamento, conformidade };
}

function computeKpis(items: AnalysisRow[]) {
  return {
    total: items.length,
    scoreMedio: avg(items.map((a) => a.score)),
    chancePagamento: avg(items.map((a) => a.chance_pagamento)),
    riscoQuebra: avg(items.map((a) => a.risco_quebra)),
  };
}

function VariationIcon({ current, previous, invertColor }: { current: number; previous: number; invertColor?: boolean }) {
  const diff = current - previous;
  if (diff === 0 || (current === 0 && previous === 0)) {
    return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-3.5 w-3.5" /> 0</span>;
  }
  const isPositive = diff > 0;
  const isGood = invertColor ? !isPositive : isPositive;
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${isGood ? "text-emerald-600" : "text-red-500"}`}>
      {isPositive ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {Math.abs(diff)}
    </span>
  );
}

function KpiCard({ title, value, icon: Icon, suffix }: { title: string; value: string | number; icon: React.ElementType; suffix?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold font-heading text-foreground">
            {value}{suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function RiskBadge({ risco }: { risco: number }) {
  if (risco > 60) return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-600">● Crítico</span>;
  if (risco >= 40) return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-600">● Atenção</span>;
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600">● Estável</span>;
}

export default function OperationRadar() {
  const { profile } = useAuth();
  const { getEmpresaFilter, isFounder } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();
  const portfolio = usePortfolioFilter();
  const { filterByDate } = useDateFilter();
  const [period, setPeriod] = useState("7d");
  const [diagnostico, setDiagnostico] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [riskDiagnostico, setRiskDiagnostico] = useState<string | null>(null);
  const [riskDiagLoading, setRiskDiagLoading] = useState(false);
  const [expandedCarteira, setExpandedCarteira] = useState<string | null>(null);

  const { data: allAnalyses = [] } = useQuery({
    queryKey: ["radar-all", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("carteira, operador, score, chance_pagamento, risco_quebra, aida_atencao, aida_interesse, aida_desejo, aida_objecao, aida_acao, categoria_erro, categoria_objecao, conformidade, nota_qa, created_at");
      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AnalysisRow[];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const analyses = filterByDate(portfolio.filterByCarteira(allAnalyses));

  const { currentItems, prevItems } = useMemo(() => {
    const { currentStart, currentEnd, prevStart, prevEnd } = getPeriodRange(period);
    const currentItems = analyses.filter((a) => {
      const d = new Date(a.created_at);
      return d >= currentStart && d <= currentEnd;
    });
    const prevItems = analyses.filter((a) => {
      const d = new Date(a.created_at);
      return d >= prevStart && d < prevEnd;
    });
    return { currentItems, prevItems };
  }, [analyses, portfolio.selected, period]);

  const currentMetrics = useMemo(() => computeRadarMetrics(currentItems), [currentItems]);
  const prevMetrics = useMemo(() => computeRadarMetrics(prevItems), [prevItems]);
  const currentKpis = useMemo(() => computeKpis(currentItems), [currentItems]);
  const prevKpis = useMemo(() => computeKpis(prevItems), [prevItems]);

  const radarAidaData = useMemo(() => [
    { subject: "Atenção", atual: currentMetrics.atencao, anterior: prevMetrics.atencao },
    { subject: "Interesse", atual: currentMetrics.interesse, anterior: prevMetrics.interesse },
    { subject: "Desejo", atual: currentMetrics.desejo, anterior: prevMetrics.desejo },
    { subject: "Ação", atual: currentMetrics.acao, anterior: prevMetrics.acao },
  ], [currentMetrics, prevMetrics]);

  const radarQualityData = useMemo(() => [
    { subject: "Investigação", atual: Math.round(currentMetrics.investigacao / 10), anterior: Math.round(prevMetrics.investigacao / 10) },
    { subject: "Fechamento", atual: Math.round(currentMetrics.fechamento / 10), anterior: Math.round(prevMetrics.fechamento / 10) },
    { subject: "Conformidade", atual: Math.round(currentMetrics.conformidade / 10), anterior: Math.round(prevMetrics.conformidade / 10) },
  ], [currentMetrics, prevMetrics]);

  const evolutionRows = useMemo(() => [
    { label: "Score Médio", current: currentKpis.scoreMedio, prev: prevKpis.scoreMedio, suffix: "" },
    { label: "Prob. Pagamento", current: currentKpis.chancePagamento, prev: prevKpis.chancePagamento, suffix: "%" },
    { label: "Risco de Quebra", current: currentKpis.riscoQuebra, prev: prevKpis.riscoQuebra, suffix: "%", invertColor: true },
    { label: "Atenção (AIDA)", current: currentMetrics.atencao, prev: prevMetrics.atencao, suffix: "" },
    { label: "Interesse (AIDA)", current: currentMetrics.interesse, prev: prevMetrics.interesse, suffix: "" },
    { label: "Desejo (AIDA)", current: currentMetrics.desejo, prev: prevMetrics.desejo, suffix: "" },
    { label: "Ação (AIDA)", current: currentMetrics.acao, prev: prevMetrics.acao, suffix: "" },
    { label: "Conformidade Legal", current: currentMetrics.conformidade, prev: prevMetrics.conformidade, suffix: "%" },
  ], [currentKpis, prevKpis, currentMetrics, prevMetrics]);

  // Ranking by carteira (current period)
  const ranking = useMemo(() => {
    const map: Record<string, { scores: number[]; chances: number[]; riscos: number[] }> = {};
    currentItems.forEach((a) => {
      if (!map[a.carteira]) map[a.carteira] = { scores: [], chances: [], riscos: [] };
      if (a.score != null) map[a.carteira].scores.push(a.score);
      if (a.chance_pagamento != null) map[a.carteira].chances.push(a.chance_pagamento);
      if (a.risco_quebra != null) map[a.carteira].riscos.push(a.risco_quebra);
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, score: avg(d.scores), chance: avg(d.chances), risco: avg(d.riscos) }))
      .sort((a, b) => b.score - a.score);
  }, [currentItems]);

  // Risk map sorted by risk desc
  const riskMap = useMemo(() => [...ranking].sort((a, b) => b.risco - a.risco), [ranking]);

  // Operators per carteira
  const operatorsByCarteira = useMemo(() => {
    const map: Record<string, Record<string, { scores: number[]; chances: number[]; riscos: number[] }>> = {};
    currentItems.forEach((a) => {
      if (!map[a.carteira]) map[a.carteira] = {};
      if (!map[a.carteira][a.operador]) map[a.carteira][a.operador] = { scores: [], chances: [], riscos: [] };
      if (a.score != null) map[a.carteira][a.operador].scores.push(a.score);
      if (a.chance_pagamento != null) map[a.carteira][a.operador].chances.push(a.chance_pagamento);
      if (a.risco_quebra != null) map[a.carteira][a.operador].riscos.push(a.risco_quebra);
    });
    const result: Record<string, { name: string; score: number; chance: number; risco: number }[]> = {};
    for (const [cart, ops] of Object.entries(map)) {
      result[cart] = Object.entries(ops)
        .map(([name, d]) => ({ name, score: avg(d.scores), chance: avg(d.chances), risco: avg(d.riscos) }))
        .sort((a, b) => b.risco - a.risco);
    }
    return result;
  }, [currentItems]);

  const errors = aggregate(currentItems.map((a) => a.categoria_erro));
  const objections = aggregate(currentItems.map((a) => a.categoria_objecao));

  // AI Diagnostic
  useEffect(() => {
    if (currentItems.length === 0) {
      setDiagnostico(null);
      return;
    }
    const metricas_atual = { ...currentKpis, ...currentMetrics, negociacoes: currentItems.length };
    const metricas_anterior = { ...prevKpis, ...prevMetrics, negociacoes: prevItems.length };
    let cancelled = false;
    setDiagLoading(true);
    setDiagnostico(null);
    supabase.functions
      .invoke("diagnostico-radar", { body: { metricas_atual, metricas_anterior } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setDiagnostico("Não foi possível gerar o diagnóstico automático.");
        } else {
          setDiagnostico(data?.diagnostico || "Sem diagnóstico disponível.");
        }
      })
      .catch(() => { if (!cancelled) setDiagnostico("Não foi possível gerar o diagnóstico automático."); })
      .finally(() => { if (!cancelled) setDiagLoading(false); });
    return () => { cancelled = true; };
  }, [currentItems.length, prevItems.length, currentKpis.scoreMedio, currentMetrics.atencao, period, portfolio.selected]);

  // Stable key for risk diagnostic dependency (avoids object reference issues)
  const riskMapKey = useMemo(
    () => riskMap.map((r) => `${r.name}:${r.score}:${r.chance}:${r.risco}`).join("|"),
    [riskMap],
  );

  // Risk AI Diagnostic
  useEffect(() => {
    if (riskMap.length === 0) {
      setRiskDiagnostico(null);
      setRiskDiagLoading(false);
      return;
    }

    // Minimum data check
    const totalNeg = currentItems.length;
    if (totalNeg < 3) {
      setRiskDiagnostico("Dados insuficientes para gerar diagnóstico confiável (mínimo recomendado: 10 negociações).");
      setRiskDiagLoading(false);
      return;
    }

    const riskData = {
      carteiras: riskMap.map((r) => ({
        carteira: r.name, score_medio: r.score, prob_pagamento: r.chance, risco_quebra: r.risco,
        status: r.risco > 60 ? "Crítico" : r.risco >= 40 ? "Atenção" : "Estável",
      })),
    };
    let cancelled = false;
    setRiskDiagLoading(true);
    setRiskDiagnostico(null);

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setRiskDiagnostico("Tempo esgotado ao gerar diagnóstico. Tente novamente.");
        setRiskDiagLoading(false);
        cancelled = true;
      }
    }, 30000);

    supabase.functions
      .invoke("diagnostico-radar", {
        body: {
          metricas_atual: riskData,
          metricas_anterior: { contexto: "Analise o mapa de risco das carteiras. Identifique: qual carteira tem maior risco, qual tem melhor estabilidade, e possíveis causas. Máximo 4 frases." },
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        clearTimeout(timeout);
        if (error) {
          console.error("Risk diagnostic error:", error);
          setRiskDiagnostico("Erro ao gerar diagnóstico. Tente novamente.");
        } else {
          setRiskDiagnostico(data?.diagnostico || "Sem diagnóstico disponível.");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        clearTimeout(timeout);
        console.error("Risk diagnostic fetch error:", err);
        setRiskDiagnostico("Não foi possível gerar o diagnóstico de risco.");
      })
      .finally(() => {
        if (!cancelled) setRiskDiagLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [riskMapKey, currentItems.length]);

  const hasData = currentItems.length > 0;
  const hasPrevData = prevItems.length > 0;

  const periodLabel = period === "7d" ? "semana" : period === "15d" ? "quinzena" : period === "30d" ? "mês" : "trimestre";

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <PageHeader title="Radar da Operação" description="Visão consolidada da qualidade das negociações da equipe." />
        <div className="flex gap-3 shrink-0">
          <PortfolioFilter
            carteiras={portfolio.carteiras}
            selected={portfolio.selected}
            onSelect={portfolio.setSelected}
            showAllOption={portfolio.showAllOption}
          />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Última semana</SelectItem>
              <SelectItem value="15d">Últimos 15 dias</SelectItem>
              <SelectItem value="30d">Último mês</SelectItem>
              <SelectItem value="90d">Últimos 3 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Comparative Radars — Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar AIDA */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading">Estrutura da Negociação (AIDA)</CardTitle>
                <div className="flex items-center gap-6 text-sm mt-2">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} atual
                  </span>
                  {hasPrevData && (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
                      {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} anterior
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarAidaData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 13, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip content={<RadarTooltip />} />
                    <Tooltip content={<RadarTooltip />} />
                    {hasPrevData && (
                      <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="5 5" />
                    )}
                    <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Qualidade */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-heading">Qualidade da Negociação</CardTitle>
                <div className="flex items-center gap-6 text-sm mt-2">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} atual
                  </span>
                  {hasPrevData && (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-muted-foreground/40" />
                      {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} anterior
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={380}>
                  <RadarChart data={radarQualityData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--foreground))", fontSize: 13, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 10]} tickCount={6} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    {hasPrevData && (
                      <Radar name="Anterior" dataKey="anterior" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="5 5" />
                    )}
                    <Radar name="Atual" dataKey="atual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Negociações Analisadas" value={currentKpis.total} icon={BarChart3} />
            <KpiCard title="Score Médio" value={currentKpis.scoreMedio} icon={Target} suffix="/100" />
            <KpiCard title="Prob. Média de Pagamento" value={`${currentKpis.chancePagamento}%`} icon={TrendingUp} />
            <KpiCard title="Risco Médio de Quebra" value={`${currentKpis.riscoQuebra}%`} icon={ShieldAlert} />
          </div>

          {/* Evolution Indicators */}
          {hasPrevData && (
            <ChartCard title="Indicadores de Evolução">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Variação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evolutionRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">{row.current}{row.suffix}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.prev}{row.suffix}</TableCell>
                      <TableCell className="text-right">
                        <VariationIcon current={row.current} previous={row.prev} invertColor={row.invertColor} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ChartCard>
          )}

          {/* AI Diagnostic */}
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Diagnóstico da Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Gerando diagnóstico...</span>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{diagnostico}</p>
              )}
            </CardContent>
          </Card>

          {/* Ranking de Carteiras */}
          {ranking.length > 1 && (
            <ChartCard title="Ranking de Carteiras">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Carteira</TableHead>
                    <TableHead className="text-right">Score Médio</TableHead>
                    <TableHead className="text-right">Prob. Pagamento</TableHead>
                    <TableHead className="text-right">Risco Quebra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.score}</TableCell>
                      <TableCell className="text-right">{r.chance}%</TableCell>
                      <TableCell className="text-right">{r.risco}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ChartCard>
          )}

          {/* Gargalos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {errors.length > 0 && (
              <ChartCard title="Erros Mais Comuns da Equipe">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={errors} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} width={180} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload }) => (
                      <EnrichedBarTooltip active={active} payload={payload as any} chartType="error" />
                    )} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {errors.map((_, i) => <Cell key={i} fill={DESTRUCTIVE} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
            {objections.length > 0 && (
              <ChartCard title="Objeções Mais Comuns dos Clientes">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={objections} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} width={180} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload }) => (
                      <EnrichedBarTooltip active={active} payload={payload as any} chartType="objection" />
                    )} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {objections.map((_, i) => <Cell key={i} fill={PRIMARY} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>

          {/* Mapa de Risco da Operação */}
          {riskMap.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Mapa de Risco da Operação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carteira</TableHead>
                      <TableHead className="text-right">Score Médio</TableHead>
                      <TableHead className="text-right">Prob. Pagamento</TableHead>
                      <TableHead className="text-right">Risco Quebra</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskMap.map((r) => (
                      <Collapsible key={r.name} open={expandedCarteira === r.name} onOpenChange={(open) => setExpandedCarteira(open ? r.name : null)} asChild>
                        <>
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-accent/50 transition-colors">
                              <TableCell className="font-medium">
                                <span className="inline-flex items-center gap-2">
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedCarteira === r.name ? "rotate-180" : ""}`} />
                                  {r.name}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{r.score}</TableCell>
                              <TableCell className="text-right">{r.chance}%</TableCell>
                              <TableCell className="text-right">{r.risco}%</TableCell>
                              <TableCell className="text-right"><RiskBadge risco={r.risco} /></TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          <CollapsibleContent asChild>
                            <>
                              {(operatorsByCarteira[r.name] || []).map((op) => (
                                <TableRow key={op.name} className="bg-muted/30">
                                  <TableCell className="pl-10 text-sm text-muted-foreground">{op.name}</TableCell>
                                  <TableCell className="text-right text-sm">{op.score}</TableCell>
                                  <TableCell className="text-right text-sm">{op.chance}%</TableCell>
                                  <TableCell className="text-right text-sm">{op.risco}%</TableCell>
                                  <TableCell className="text-right"><RiskBadge risco={op.risco} /></TableCell>
                                </TableRow>
                              ))}
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Risk Diagnostic */}
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Brain className="h-5 w-5 text-destructive" />
                Diagnóstico de Risco da Operação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {riskDiagLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Gerando diagnóstico de risco...</span>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{riskDiagnostico || "Nenhum dado para análise de risco."}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
