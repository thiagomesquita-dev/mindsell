import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PortfolioFilter } from "@/components/PortfolioFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KpiCard } from "@/components/KpiCard";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { usePortfolioFilter } from "@/hooks/usePortfolioFilter";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Target,
  Activity, Lightbulb, ArrowUpDown, TrendingDown, Crosshair,
  BookOpen, Zap, ShieldAlert, CircleDollarSign,
} from "lucide-react";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";

// ─── Utilities ───────────────────────────────────────────────
function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type AlertLevel = "critico" | "atencao" | "saudavel";

function alertBadge(level: AlertLevel) {
  if (level === "critico")
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Crítico</Badge>;
  if (level === "atencao")
    return <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30">Atenção</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Saudável</Badge>;
}

function alertBorder(level: AlertLevel) {
  if (level === "critico") return "border-destructive/30 bg-destructive/5";
  if (level === "atencao") return "border-yellow-500/30 bg-yellow-500/5";
  return "border-emerald-500/30 bg-emerald-500/5";
}

function extractAidaNota(aida: unknown): number {
  if (!aida || typeof aida !== "object") return 0;
  return Number((aida as Record<string, unknown>).nota ?? 0);
}

function aidaColorClass(score: number) {
  if (score >= 7.5) return "text-emerald-500";
  if (score >= 6) return "text-yellow-500";
  return "text-destructive";
}

const AIDA_LABELS: Record<string, string> = {
  atencao: "Atenção",
  interesse: "Interesse",
  desejo: "Desejo",
  acao: "Ação",
};

const AIDA_DESCRIPTIONS: Record<string, string> = {
  atencao: "Abertura, identificação e contexto",
  interesse: "Ancoragem, economia e escolha guiada",
  desejo: "Empatia, personalização e objeções",
  acao: "Fechamento, confirmação e encaminhamento",
};

// ─── Types ───────────────────────────────────────────────────
interface OperatorAgg {
  nome: string;
  qualidadeMedia: number;
  chanceMedia: number;
  atencao: number;
  interesse: number;
  desejo: number;
  acao: number;
  valorPago: number;
  count: number;
}

interface InsightCard {
  level: AlertLevel;
  problema: string;
  impacto: string;
  acao: string;
  operador?: string;
  perdaEstimada?: number;
}

// ─── Component ───────────────────────────────────────────────
export default function FinancialAnalysis() {
  const { profile } = useAuth();
  const portfolio = usePortfolioFilter();
  const [operadorFilter, setOperadorFilter] = useState("all");

  // Company filter for founder
  const { isFounder, getEmpresaFilter } = useCompanyFilter();
  const empresaFilter = getEmpresaFilter();

  const { data: allAnalyses = [] } = useQuery({
    queryKey: ["fin-analysis-analyses", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("analyses")
        .select("operador, carteira, score, chance_pagamento, aida_atencao, aida_interesse, aida_desejo, aida_acao, created_at")
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

  const { data: allOperators = [] } = useQuery({
    queryKey: ["fin-analysis-operators", empresaFilter, isFounder],
    queryFn: async () => {
      let query = supabase
        .from("operators")
        .select("nome, carteira, valor_pago_periodo, periodo_referencia, status")
        .eq("status", "ativo")
        .order("nome");

      if (empresaFilter) {
        query = query.eq("empresa_id", empresaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as { nome: string; carteira: string; valor_pago_periodo: number | null; periodo_referencia: string | null; status: string }[];
    },
    enabled: isFounder || !!profile?.empresa_id,
  });

  const analyses = portfolio.filterByCarteira(allAnalyses);
  const ops = useMemo(() => {
    if (portfolio.selected === "Todas") return allOperators;
    return allOperators.filter((o) => o.carteira === portfolio.selected);
  }, [allOperators, portfolio.selected]);

  // ── Aggregation ──
  const operatorData = useMemo<OperatorAgg[]>(() => {
    const map = new Map<string, {
      nome: string; tScore: number; tChance: number;
      tA: number; tI: number; tD: number; tAc: number;
      count: number; valorPago: number;
    }>();

    for (const op of ops) {
      map.set(op.nome, {
        nome: op.nome, tScore: 0, tChance: 0,
        tA: 0, tI: 0, tD: 0, tAc: 0,
        count: 0, valorPago: Number(op.valor_pago_periodo) || 0,
      });
    }

    for (const a of analyses) {
      const e = map.get(a.operador);
      if (!e) continue;
      e.tScore += Number(a.score) || 0;
      e.tChance += Number(a.chance_pagamento) || 0;
      e.tA += extractAidaNota(a.aida_atencao);
      e.tI += extractAidaNota(a.aida_interesse);
      e.tD += extractAidaNota(a.aida_desejo);
      e.tAc += extractAidaNota(a.aida_acao);
      e.count += 1;
    }

    return Array.from(map.values())
      .filter((o) => o.count > 0)
      .map((o) => ({
        nome: o.nome,
        qualidadeMedia: o.tScore / o.count,
        chanceMedia: o.tChance / o.count,
        atencao: o.tA / o.count,
        interesse: o.tI / o.count,
        desejo: o.tD / o.count,
        acao: o.tAc / o.count,
        valorPago: o.valorPago,
        count: o.count,
      }));
  }, [ops, analyses]);

  const filtered = useMemo(() => {
    if (operadorFilter === "all") return operatorData;
    return operatorData.filter((o) => o.nome === operadorFilter);
  }, [operatorData, operadorFilter]);

  // ── KPIs ──
  const totalPago = filtered.reduce((s, o) => s + o.valorPago, 0);
  const avgQualidade = filtered.length > 0
    ? filtered.reduce((s, o) => s + o.qualidadeMedia, 0) / filtered.length : 0;
  const avgChance = filtered.length > 0
    ? filtered.reduce((s, o) => s + o.chanceMedia, 0) / filtered.length : 0;
  const totalNegociacoes = filtered.reduce((s, o) => s + o.count, 0);

  // ── Perda estimada ──
  const valorPotencial = useMemo(() => {
    if (!totalPago || avgChance <= 0 || totalNegociacoes <= 0) return 0;
    // Se a chance média prevista fosse convertida integralmente
    const ticketMedioPorNeg = totalPago / filtered.filter((o) => o.valorPago > 0).length || 0;
    return ticketMedioPorNeg * filtered.length;
  }, [totalPago, avgChance, totalNegociacoes, filtered]);
  const perdaEstimada = Math.max(0, valorPotencial - totalPago);

  const hasFinancialData = filtered.some((o) => o.valorPago > 0);
  const avgPago = hasFinancialData ? totalPago / filtered.filter((o) => o.valorPago > 0).length : 0;

  // ── Ranking ──
  const ranking = useMemo(() => [...filtered].sort((a, b) => b.valorPago - a.valorPago), [filtered]);

  // ── Promise vs Reality with interpretation ──
  const promiseVsReality = useMemo(() => {
    const totalPagoAll = ops.reduce((s, op) => s + (Number(op.valor_pago_periodo) || 0), 0);
    return filtered.map((o) => {
      const shareReal = totalPagoAll > 0 ? (o.valorPago / totalPagoAll) * 100 : 0;
      const chancePrev = o.chanceMedia;
      const gap = shareReal - chancePrev;
      const conversaoPor100 = Math.round(shareReal);
      return {
        nome: o.nome, chancePrevista: chancePrev, shareReal, gap, valorPago: o.valorPago,
        conversaoPor100,
        level: (gap <= -20 ? "critico" : gap <= -10 ? "atencao" : "saudavel") as AlertLevel,
      };
    }).sort((a, b) => a.gap - b.gap);
  }, [filtered, ops]);

  // ── Weakest AIDA stage per operator ──
  function weakestAida(o: OperatorAgg): { stage: string; score: number } {
    const stages = [
      { stage: "atencao", score: o.atencao },
      { stage: "interesse", score: o.interesse },
      { stage: "desejo", score: o.desejo },
      { stage: "acao", score: o.acao },
    ];
    return stages.reduce((min, s) => s.score < min.score ? s : min, stages[0]);
  }

  // ── Smart Diagnostics (Insight Cards) ──
  const insights = useMemo<InsightCard[]>(() => {
    const cards: InsightCard[] = [];

    for (const o of filtered) {
      const weak = weakestAida(o);

      // High chance + low financial result
      if (o.chanceMedia >= 60 && o.valorPago > 0 && o.valorPago < avgPago * 0.6) {
        const potencial = avgPago;
        cards.push({
          level: "critico",
          operador: o.nome,
          problema: `Chance de pagamento prevista de ${o.chanceMedia.toFixed(0)}%, mas resultado financeiro de apenas ${formatBRL(o.valorPago)} — ${((o.valorPago / avgPago) * 100).toFixed(0)}% da média da equipe.`,
          impacto: `Perda estimada de ${formatBRL(potencial - o.valorPago)} neste período. A cada 100 negociações, a previsão indica ${o.chanceMedia.toFixed(0)} conversões, mas o resultado sugere um número significativamente menor.`,
          acao: `Priorizar acompanhamento de fechamento. A etapa mais fraca do AIDA é "${AIDA_LABELS[weak.stage]}" (${weak.score.toFixed(1)}/10) — ${AIDA_DESCRIPTIONS[weak.stage]}. Realizar sessão de coaching focada nesta etapa.`,
          perdaEstimada: potencial - o.valorPago,
        });
      }

      // High chance + no financial data
      if (o.chanceMedia >= 60 && o.valorPago === 0 && hasFinancialData) {
        cards.push({
          level: "atencao",
          operador: o.nome,
          problema: `Chance prevista de ${o.chanceMedia.toFixed(0)}%, mas sem dados financeiros importados para validação.`,
          impacto: `Não é possível medir a efetividade real deste operador. As previsões comportamentais não podem ser validadas sem o cruzamento financeiro.`,
          acao: `Importar dados financeiros deste operador na próxima atualização. Enquanto isso, acompanhar manualmente os fechamentos.`,
        });
      }

      // Low quality + high financial result (anomaly)
      if (o.qualidadeMedia < 5.5 && o.valorPago > avgPago * 1.2) {
        cards.push({
          level: "atencao",
          operador: o.nome,
          problema: `Qualidade abaixo do padrão (${o.qualidadeMedia.toFixed(1)}/10), mas resultado financeiro acima da média (${formatBRL(o.valorPago)}).`,
          impacto: `Anomalia positiva: o operador pode estar utilizando uma abordagem efetiva não capturada pela análise comportamental, ou o resultado pode ser pontual e não sustentável.`,
          acao: `Investigar o estilo de negociação. Ouvir áudios recentes para identificar padrões. Se a abordagem for replicável, considerar como benchmark. Se não, alertar sobre risco de quebra de acordo.`,
        });
      }

      // Weak Ação + has financial data → closing failure
      if (o.acao < 5 && o.valorPago > 0) {
        const impactoPct = ((avgPago - o.valorPago) / avgPago * 100);
        if (impactoPct > 20) {
          cards.push({
            level: "critico",
            operador: o.nome,
            problema: `Nota de Ação (fechamento) de apenas ${o.acao.toFixed(1)}/10. O operador está falhando na etapa final da negociação.`,
            impacto: `A falha no fechamento está diretamente ligada à perda de receita. Operadores com nota de Ação acima de 7.5 convertem em média ${((avgPago / totalPago) * 100 * 1.3).toFixed(0)}% mais receita.`,
            acao: `Treinar: confirmação de data, horário e meio de pagamento. Praticar condução ativa ("Vou aguardar a confirmação do pagamento agora"). Simular cenários de fechamento.`,
            perdaEstimada: avgPago - o.valorPago > 0 ? avgPago - o.valorPago : undefined,
          });
        }
      }

      // High quality + high result → recognize
      if (o.qualidadeMedia >= 7.5 && o.valorPago >= avgPago * 1.1) {
        cards.push({
          level: "saudavel",
          operador: o.nome,
          problema: `Qualidade consistente (${o.qualidadeMedia.toFixed(1)}/10) com resultado financeiro acima da média (${formatBRL(o.valorPago)}).`,
          impacto: `Este operador demonstra alinhamento entre comportamento e resultado. Potencial referência para a equipe.`,
          acao: `Reconhecer publicamente o desempenho. Considerar como mentor para operadores em desenvolvimento. Utilizar gravações como material de treinamento.`,
        });
      }
    }

    // Global insight if no issues
    if (cards.length === 0 && filtered.length > 0) {
      cards.push({
        level: "saudavel",
        problema: "Nenhuma inconsistência crítica detectada entre previsão comportamental e resultado financeiro.",
        impacto: "A equipe está operando dentro do padrão esperado. Continue monitorando para identificar tendências.",
        acao: "Manter acompanhamento regular. Definir metas de melhoria incremental com base nos indicadores AIDA.",
      });
    }

    return cards.sort((a, b) => {
      const order = { critico: 0, atencao: 1, saudavel: 2 };
      return order[a.level] - order[b.level];
    });
  }, [filtered, avgPago, hasFinancialData, totalPago]);

  // ── AIDA Financial ──
  const aidaFinancial = useMemo(() => {
    if (filtered.length === 0) return null;
    const t = filtered.reduce(
      (acc, o) => ({
        a: acc.a + o.atencao * o.valorPago,
        i: acc.i + o.interesse * o.valorPago,
        d: acc.d + o.desejo * o.valorPago,
        ac: acc.ac + o.acao * o.valorPago,
        tp: acc.tp + o.valorPago,
      }),
      { a: 0, i: 0, d: 0, ac: 0, tp: 0 },
    );
    if (t.tp === 0) return null;

    const stages = [
      { key: "atencao", score: t.a / t.tp },
      { key: "interesse", score: t.i / t.tp },
      { key: "desejo", score: t.d / t.tp },
      { key: "acao", score: t.ac / t.tp },
    ];
    const weakest = stages.reduce((min, s) => s.score < min.score ? s : min, stages[0]);
    const strongest = stages.reduce((max, s) => s.score > max.score ? s : max, stages[0]);

    return { stages, weakest, strongest };
  }, [filtered]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Análise Financeira"
        description="Painel de decisão: qualidade comportamental conectada ao resultado financeiro real."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <PortfolioFilter
          carteiras={portfolio.carteiras}
          selected={portfolio.selected}
          onSelect={portfolio.setSelected}
          showAllOption={portfolio.showAllOption}
        />
        <Select value={operadorFilter} onValueChange={setOperadorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Operador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {operatorData.map((o) => (
              <SelectItem key={o.nome} value={o.nome}>{o.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasFinancialData && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            Nenhum dado financeiro importado. Acesse <strong>Importação Financeira</strong> para carregar os dados.
          </AlertDescription>
        </Alert>
      )}

      {/* ── KPIs ── */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          <KpiCard title="Total Pago (R$)" value={formatBRL(totalPago)} icon={<DollarSign className="h-5 w-5" />} />
          <KpiCard title="Qualidade Média" value={avgQualidade > 0 ? avgQualidade.toFixed(1) : "—"} icon={<TrendingUp className="h-5 w-5" />} />
          <KpiCard title="Chance Média Prevista" value={avgChance > 0 ? `${avgChance.toFixed(0)}%` : "—"} icon={<Target className="h-5 w-5" />} />
          <KpiCard title="Negociações Analisadas" value={totalNegociacoes.toLocaleString("pt-BR")} icon={<Activity className="h-5 w-5" />} />
          <KpiCard
            title="Perda Estimada"
            value={perdaEstimada > 0 ? formatBRL(perdaEstimada) : "—"}
            icon={<TrendingDown className="h-5 w-5" />}
            tooltip="Diferença entre o valor potencial (se todos operadores atingissem a média) e o valor real pago."
          />
        </div>
      </section>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum operador com análises encontradas.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── 1. Diagnóstico Inteligente ── */}
          <section>
            <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Diagnóstico Inteligente
            </h2>
            <div className="space-y-4">
              {insights.map((ins, i) => (
                <Card key={i} className={`border-l-4 ${ins.level === "critico" ? "border-l-destructive" : ins.level === "atencao" ? "border-l-yellow-500" : "border-l-emerald-500"}`}>
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {ins.level === "critico" && <ShieldAlert className="h-5 w-5 text-destructive" />}
                        {ins.level === "atencao" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                        {ins.level === "saudavel" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                        {ins.operador && <span className="font-heading font-semibold">{ins.operador}</span>}
                        {alertBadge(ins.level)}
                      </div>
                      {ins.perdaEstimada && ins.perdaEstimada > 0 && (
                        <Badge variant="outline" className="border-destructive/30 text-destructive font-medium">
                          Perda: {formatBRL(ins.perdaEstimada)}
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    {/* Body: 3 blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Crosshair className="h-3 w-3" /> Problema
                        </p>
                        <p className="text-sm">{ins.problema}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <CircleDollarSign className="h-3 w-3" /> Impacto
                        </p>
                        <p className="text-sm">{ins.impacto}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Zap className="h-3 w-3" /> O que fazer
                        </p>
                        <p className="text-sm">{ins.acao}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── 2. AIDA Financeiro ── */}
          {aidaFinancial && (
            <section>
              <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                AIDA Financeiro
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Nota de cada etapa da negociação ponderada pelo valor financeiro recuperado.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {aidaFinancial.stages.map((item) => (
                  <Card key={item.key} className={item.key === aidaFinancial.weakest.key ? "ring-2 ring-destructive/30" : ""}>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{AIDA_LABELS[item.key]}</p>
                      <p className={`text-3xl font-heading font-bold ${aidaColorClass(item.score)}`}>
                        {item.score.toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">/10</p>
                      <Badge className={`mt-2 ${item.score >= 7.5
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : item.score >= 6
                          ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }`}>
                        {item.score >= 7.5 ? "Bom" : item.score >= 6 ? "Atenção" : "Crítico"}
                      </Badge>
                      {item.key === aidaFinancial.weakest.key && (
                        <p className="text-[10px] text-destructive mt-1 font-medium">← Etapa mais fraca</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* AIDA interpretation */}
              <Card className={alertBorder(aidaFinancial.weakest.score < 6 ? "critico" : aidaFinancial.weakest.score < 7.5 ? "atencao" : "saudavel")}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Interpretação</p>
                  </div>
                  <p className="text-sm">
                    A etapa com maior impacto negativo na receita é <strong>{AIDA_LABELS[aidaFinancial.weakest.key]}</strong> ({aidaFinancial.weakest.score.toFixed(1)}/10)
                    — {AIDA_DESCRIPTIONS[aidaFinancial.weakest.key]}.
                    {aidaFinancial.weakest.score < 6
                      ? " Esta nota crítica indica que a equipe precisa de treinamento imediato nesta etapa."
                      : " Melhorar esta etapa pode trazer o maior retorno financeiro incremental."
                    }
                  </p>
                  <p className="text-sm">
                    A etapa mais forte é <strong>{AIDA_LABELS[aidaFinancial.strongest.key]}</strong> ({aidaFinancial.strongest.score.toFixed(1)}/10).
                    Utilizar como referência de boas práticas nos treinamentos.
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ── 3. Ranking Financeiro ── */}
          <section>
            <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Ranking Financeiro
            </h2>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead className="text-right">Qualidade</TableHead>
                      <TableHead className="text-right">Chance Pgto</TableHead>
                      <TableHead className="text-right">Pago (R$)</TableHead>
                      <TableHead className="text-right">Negociações</TableHead>
                      <TableHead className="text-center">Etapa Fraca</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((o, i) => {
                      const level: AlertLevel = o.qualidadeMedia >= 7.5 ? "saudavel" : o.qualidadeMedia >= 6 ? "atencao" : "critico";
                      const weak = weakestAida(o);
                      return (
                        <TableRow key={o.nome}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{o.nome}</TableCell>
                          <TableCell className="text-right">{o.qualidadeMedia.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{o.chanceMedia.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(o.valorPago)}</TableCell>
                          <TableCell className="text-right">{o.count}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-xs ${weak.score < 6 ? "border-destructive/30 text-destructive" : "border-yellow-500/30 text-yellow-500"}`}>
                              {AIDA_LABELS[weak.stage]} ({weak.score.toFixed(1)})
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{alertBadge(level)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          {/* ── 4. Promessa vs Realidade ── */}
          {hasFinancialData && (
            <section>
              <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Promessa vs Realidade
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Comparação entre a chance prevista pela IA e o resultado financeiro real.
              </p>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operador</TableHead>
                        <TableHead className="text-right">Chance Prevista</TableHead>
                        <TableHead className="text-right">Pago (R$)</TableHead>
                        <TableHead className="text-right">
                          <span className="flex items-center justify-end gap-1">
                            Gap <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                        <TableHead>Tradução</TableHead>
                        <TableHead className="text-center">Alerta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promiseVsReality.map((o) => (
                        <TableRow key={o.nome}>
                          <TableCell className="font-medium">{o.nome}</TableCell>
                          <TableCell className="text-right">{o.chancePrevista.toFixed(0)}%</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(o.valorPago)}</TableCell>
                          <TableCell className={`text-right font-bold ${o.gap >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                            {o.gap >= 0 ? "+" : ""}{o.gap.toFixed(1)}pp
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                            {o.gap <= -20
                              ? `A cada 100 negociações previstas, apenas ~${Math.max(0, o.conversaoPor100)} geram resultado.`
                              : o.gap <= -10
                                ? `Resultado abaixo do previsto — margem de melhoria significativa.`
                                : `Conversão dentro ou acima do esperado.`
                            }
                          </TableCell>
                          <TableCell className="text-center">{alertBadge(o.level)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ── 5. Ação Recomendada (global) ── */}
          <section>
            <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Plano de Ação Recomendado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Training focus */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <p className="font-heading font-semibold text-sm">Foco de Treinamento</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {aidaFinancial
                      ? `Priorizar a etapa "${AIDA_LABELS[aidaFinancial.weakest.key]}" (${aidaFinancial.weakest.score.toFixed(1)}/10) — é a etapa com maior impacto na receita. ${AIDA_DESCRIPTIONS[aidaFinancial.weakest.key]}.`
                      : "Importe dados financeiros para identificar o foco de treinamento ideal."
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Behavior expected */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <p className="font-heading font-semibold text-sm">Comportamento Esperado</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {filtered.some((o) => o.acao < 5)
                      ? "Operadores devem confirmar data, horário e meio de pagamento em toda negociação. Praticar condução ativa até a finalização."
                      : filtered.some((o) => o.desejo < 5)
                        ? "Operadores devem investigar objeções ativamente, reformular propostas e personalizar a abordagem ao perfil do cliente."
                        : "Manter o padrão atual de condução. Buscar melhorias incrementais nos pontos fracos individuais."
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Improvement focus */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <p className="font-heading font-semibold text-sm">Meta de Melhoria</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {perdaEstimada > 0
                      ? `Recuperar até ${formatBRL(perdaEstimada * 0.3)} no próximo período nivelando os operadores abaixo da média. Isso representa ~30% da perda estimada atual.`
                      : avgQualidade > 0
                        ? `Elevar a qualidade média de ${avgQualidade.toFixed(1)} para ${Math.min(10, avgQualidade + 0.5).toFixed(1)} no próximo ciclo.`
                        : "Definir metas após importação dos dados financeiros."
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
