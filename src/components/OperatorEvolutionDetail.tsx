import { useMemo, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Target, Activity, Calendar, ArrowLeft, GraduationCap, CheckCircle2, Clock, BookOpen, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyFilter } from "@/contexts/CompanyFilterContext";
import { toast } from "sonner";

const PRIMARY = "hsl(var(--primary))";
const SUCCESS = "#16a34a";
const DESTRUCTIVE = "hsl(var(--destructive))";
const MIN_ANALYSES = 3;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-6">{title}</h2>
      {children}
    </div>
  );
}

function EvolutionBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const config: Record<string, { icon: typeof TrendingUp; color: string; label: string }> = {
    MELHOROU: { icon: TrendingUp, color: "text-green-500", label: "Melhorou" },
    MANTEVE_PADRAO: { icon: Minus, color: "text-yellow-500", label: "Manteve Padrão" },
    PIOROU: { icon: TrendingDown, color: "text-red-500", label: "Piorou" },
  };
  const c = config[value] || config.MANTEVE_PADRAO;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`${c.color} border-current gap-1`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
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

function formatWeekRange(start: Date, end: Date): string {
  return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
}

interface AnalysisRow {
  id: string;
  operador: string;
  score: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  categoria_erro: string | null;
  categoria_objecao: string | null;
  created_at: string;
  carteira?: string;
}

interface TrainingSession {
  id: string;
  operador: string;
  created_at: string;
  nota_final: number | null;
  status: string;
  origem: string;
}

interface ComputedWeek {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  count: number;
  scoreMedio: number;
  pagamentoMedio: number;
  riscoMedio: number;
  erros: string[];
  objecoes: string[];
  evolution: string | null;
}

function computeWeeklyData(analyses: AnalysisRow[]): ComputedWeek[] {
  const weekMap = new Map<string, { start: Date; end: Date; items: AnalysisRow[] }>();
  for (const a of analyses) {
    const d = new Date(a.created_at);
    const monday = getWeekMonday(d);
    const key = monday.toISOString();
    if (!weekMap.has(key)) {
      weekMap.set(key, { start: monday, end: getWeekSunday(monday), items: [] });
    }
    weekMap.get(key)!.items.push(a);
  }
  const weeks = Array.from(weekMap.values())
    .filter(w => w.items.length >= MIN_ANALYSES)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let prevScore: number | null = null;
  return weeks.map(w => {
    const scores = w.items.map(a => Number(a.score) || 0);
    const pagamentos = w.items.map(a => Number(a.chance_pagamento) || 0);
    const riscos = w.items.map(a => Number(a.risco_quebra) || 0);
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const scoreMedio = avg(scores);
    const pagamentoMedio = avg(pagamentos);
    const riscoMedio = avg(riscos);

    const erroCount: Record<string, number> = {};
    const objCount: Record<string, number> = {};
    w.items.forEach(a => {
      if (a.categoria_erro) erroCount[a.categoria_erro] = (erroCount[a.categoria_erro] || 0) + 1;
      if (a.categoria_objecao) objCount[a.categoria_objecao] = (objCount[a.categoria_objecao] || 0) + 1;
    });
    const topErros = Object.entries(erroCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
    const topObjs = Object.entries(objCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

    let evolution: string | null = null;
    if (prevScore !== null) {
      const diff = scoreMedio - prevScore;
      if (diff > 3) evolution = "MELHOROU";
      else if (diff < -3) evolution = "PIOROU";
      else evolution = "MANTEVE_PADRAO";
    }
    prevScore = scoreMedio;

    return {
      weekStart: w.start, weekEnd: w.end,
      label: formatWeekRange(w.start, w.end),
      count: w.items.length,
      scoreMedio: Math.round(scoreMedio),
      pagamentoMedio: Math.round(pagamentoMedio),
      riscoMedio: Math.round(riscoMedio),
      erros: topErros, objecoes: topObjs, evolution,
    };
  });
}

interface Props {
  operatorName: string;
  analyses: AnalysisRow[];
  weeklyReports: any[];
  trainingSessions?: TrainingSession[];
  onBack: () => void;
}

export function OperatorEvolutionDetail({ operatorName, analyses, weeklyReports, trainingSessions = [], onBack }: Props) {
  const { profile } = useAuth();
  const { getEmpresaFilter } = useCompanyFilter();
  const [isGenerating, setIsGenerating] = useState(false);
  const opAnalyses = useMemo(() => analyses.filter(a => a.operador === operatorName), [analyses, operatorName]);
  const computedWeeks = useMemo(() => computeWeeklyData(opAnalyses), [opAnalyses]);

  const opTrainings = useMemo(
    () => trainingSessions.filter(t => t.operador === operatorName),
    [trainingSessions, operatorName]
  );

  const trainingStats = useMemo(() => {
    const total = opTrainings.length;
    const responded = opTrainings.filter(t => t.status === "respondido" || t.status === "avaliado").length;
    const pending = total - responded;
    return { total, responded, pending };
  }, [opTrainings]);

  const opWeeklyReports = useMemo(
    () => weeklyReports.filter((r: any) => r.operador === operatorName),
    [weeklyReports, operatorName]
  );

  const displayWeeks = useMemo(() => {
    const reportMap = new Map<string, any>();
    opWeeklyReports.forEach((r: any) => {
      const monday = getWeekMonday(new Date(r.data_inicio_semana));
      reportMap.set(monday.toISOString(), r);
    });
    return computedWeeks.map(cw => {
      const report = reportMap.get(cw.weekStart.toISOString());
      return {
        ...cw,
        avaliacao_geral: report?.avaliacao_geral || null,
        plano_desenvolvimento: report?.plano_desenvolvimento || null,
        classificacao_evolucao: report?.classificacao_evolucao || cw.evolution,
        comparacao: report?.comparacao_com_semana_anterior || null,
        erros: report?.principais_erros?.length ? report.principais_erros : cw.erros,
        objecoes: report?.principais_objecoes?.length ? report.principais_objecoes : cw.objecoes,
      };
    });
  }, [computedWeeks, opWeeklyReports]);

  const currentWeekMonday = useMemo(() => getWeekMonday(new Date()), []);
  const currentWeekCount = useMemo(
    () => opAnalyses.filter(a => new Date(a.created_at) >= currentWeekMonday).length,
    [opAnalyses, currentWeekMonday]
  );

  const latestWeek = displayWeeks.length > 0 ? displayWeeks[displayWeeks.length - 1] : null;

  const scoreData = displayWeeks.map(w => ({
    name: w.label, score: w.scoreMedio, pagamento: w.pagamentoMedio, risco: w.riscoMedio,
  }));

  const handleGenerateCompleteTraining = async () => {
    if (!profile?.empresa_id) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-treino-automatico", {
        body: {
          operador: operatorName,
          empresa_id: profile.empresa_id,
          supervisor_id: profile.id,
          supervisor_nome: profile.nome || profile.email,
          carteira: opAnalyses[0]?.carteira || "",
          tipo: "completo",
        },
      });
      if (error) throw error;
      if (data?.skipped) {
        toast.warning(data.reason || "Não foi possível gerar o treino completo.");
      } else if (data?.success) {
        toast.success("Treino Completo gerado com sucesso! Link copiado.");
        if (data.link) navigator.clipboard.writeText(data.link).catch(() => {});
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (err: unknown) {
      toast.error("Erro ao gerar treino: " + (err instanceof Error ? err.message : "Erro desconhecido"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-heading text-xl font-bold text-foreground">{operatorName}</h2>
          <p className="text-sm text-muted-foreground">{opAnalyses.length} análises no total</p>
        </div>
        <Button
          onClick={handleGenerateCompleteTraining}
          disabled={isGenerating || opAnalyses.length < 3}
          className="gap-2"
          title={opAnalyses.length < 3 ? "Mínimo de 3 análises necessárias" : "Gerar treino baseado na evolução do operador"}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
          Gerar Treino Completo
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Semanas Analisadas" value={displayWeeks.length} icon={<Calendar className="h-5 w-5" />} />
        <KpiCard title="Qualidade da Última Semana" value={latestWeek ? `${latestWeek.scoreMedio}` : "—"} icon={<Target className="h-5 w-5" />} />
        <KpiCard title="Negociações na Semana Atual" value={currentWeekCount} icon={<Activity className="h-5 w-5" />} />
        <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-secondary">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Evolução</p>
            {latestWeek?.classificacao_evolucao ? (
              <EvolutionBadge value={latestWeek.classificacao_evolucao} />
            ) : (
              <p className="text-lg font-semibold text-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Training Summary Section */}
      {trainingStats.total > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Treinamentos do Operador</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
              <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">{trainingStats.total}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-green-500/10 rounded-lg p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Respondidos</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{trainingStats.responded}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-yellow-500/10 rounded-lg p-3">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{trainingStats.pending}</p>
              </div>
            </div>
          </div>
          {/* Recent trainings list */}
          {opTrainings.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/50">
              <p className="font-medium text-foreground text-sm mb-1">Últimos treinamentos</p>
              {[...opTrainings].reverse().slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <span>{new Date(t.created_at).toLocaleDateString("pt-BR")}</span>
                  <span className={t.status === "respondido" || t.status === "avaliado" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                    {t.status === "respondido" || t.status === "avaliado" ? "respondido" : "pendente"}
                    {t.nota_final != null && ` — nota ${t.nota_final}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {trainingStats.total === 0 && (
        <div className="bg-secondary/30 border border-border rounded-xl p-4 flex items-center gap-3">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum treinamento registrado para este operador no período.</p>
        </div>
      )}

      {displayWeeks.length === 0 && opAnalyses.length > 0 && (
        <div className="bg-secondary/50 border border-border rounded-xl p-4 text-sm text-muted-foreground space-y-1">
          <p>Este operador ainda não atingiu o volume mínimo de {MIN_ANALYSES} análises em uma mesma semana para gerar evolução.</p>
        </div>
      )}

      {/* Chart */}
      {scoreData.length > 0 && (
        <ChartCard title="Evolução Semanal de Performance">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
              <Line type="monotone" dataKey="score" stroke={PRIMARY} name="Qualidade" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="pagamento" stroke={SUCCESS} name="Chance de Pagamento" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="risco" stroke={DESTRUCTIVE} name="Risco Quebra" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Weekly History */}
      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">Histórico Semanal</h2>
        {displayWeeks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Este operador ainda não atingiu o volume mínimo de {MIN_ANALYSES} análises para gerar evolução.
          </p>
        ) : (
          [...displayWeeks].reverse().map((week, idx) => (
            <div key={idx} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-heading font-semibold text-foreground">{week.label}</h3>
                  <EvolutionBadge value={week.classificacao_evolucao} />
                </div>
                <span className="text-xs text-muted-foreground">{week.count} negociações</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Qualidade Média</p>
                  <p className="text-xl font-bold text-foreground">{week.scoreMedio}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chance de Pagamento</p>
                  <p className="text-xl font-bold text-foreground">{week.pagamentoMedio}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risco Quebra</p>
                  <p className="text-xl font-bold text-foreground">{week.riscoMedio}%</p>
                </div>
              </div>
              {week.avaliacao_geral && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Avaliação Geral</p>
                  <p className="text-sm text-foreground">{week.avaliacao_geral}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {week.erros.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Principais Erros</p>
                    <ul className="space-y-1">
                      {week.erros.map((e: string, i: number) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                          <span className="text-destructive mt-0.5">•</span> {e}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {week.objecoes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Principais Objeções</p>
                    <ul className="space-y-1">
                      {week.objecoes.map((o: string, i: number) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {week.plano_desenvolvimento && (
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Plano de Desenvolvimento</p>
                  <p className="text-sm text-foreground">{week.plano_desenvolvimento}</p>
                </div>
              )}
              {week.comparacao && (
                <div className="bg-secondary rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Comparação com Semana Anterior</p>
                  <p className="text-sm text-foreground">
                    {(week.comparacao as Record<string, unknown>)?.comentario as string || ""}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
