import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, HelpCircle, Info } from "lucide-react";

interface Analysis {
  id: string;
  user_id: string;
  operador: string;
  score: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  created_at: string;
  carteira: string;
}

interface TrainingSession {
  id: string;
  supervisor_id: string | null;
  status: string;
  operador: string;
}

interface SupervisorProfile {
  id: string;
  nome: string;
}

interface Props {
  analyses: Analysis[];
  trainingSessions: TrainingSession[];
  supervisors: SupervisorProfile[];
  periodStart: Date | null;
  periodEnd: Date;
}

type OperatorTrend = "improving" | "stable" | "worsening" | "no_base";

function computePerformanceScore(quality: number, payment: number, risk: number): number {
  return quality * 0.4 + payment * 0.35 + (100 - risk) * 0.25;
}

function classifyOperator(
  analyses: Analysis[],
  midpoint: number,
): OperatorTrend {
  const firstHalf = analyses.filter((a) => new Date(a.created_at).getTime() < midpoint);
  const secondHalf = analyses.filter((a) => new Date(a.created_at).getTime() >= midpoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return "no_base";

  const avg = (items: Analysis[]) => {
    const scores = items.filter((a) => a.score != null);
    const payments = items.filter((a) => a.chance_pagamento != null);
    const risks = items.filter((a) => a.risco_quebra != null);
    const q = scores.length > 0 ? scores.reduce((s, a) => s + Number(a.score), 0) / scores.length : 0;
    const p = payments.length > 0 ? payments.reduce((s, a) => s + Number(a.chance_pagamento), 0) / payments.length : 0;
    const r = risks.length > 0 ? risks.reduce((s, a) => s + Number(a.risco_quebra), 0) / risks.length : 0;
    return computePerformanceScore(q, p, r);
  };

  const score1 = avg(firstHalf);
  const score2 = avg(secondHalf);
  const diff = score2 - score1;

  if (diff >= 3) return "improving";
  if (diff <= -3) return "worsening";
  return "stable";
}

function getTrendIcon(trend: OperatorTrend) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === "worsening") return <TrendingDown className="h-4 w-4 text-destructive" />;
  if (trend === "no_base") return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function getTrendLabel(trend: OperatorTrend) {
  if (trend === "improving") return "Melhorando";
  if (trend === "worsening") return "Piorando";
  if (trend === "no_base") return "Sem base";
  return "Estável";
}

export function SupervisorTeamEvolution({ analyses, trainingSessions, supervisors, periodStart, periodEnd }: Props) {
  const data = useMemo(() => {
    const startMs = periodStart ? periodStart.getTime() : 0;
    const endMs = periodEnd.getTime();
    const midpoint = startMs + (endMs - startMs) / 2;

    return supervisors.map((sup) => {
      const supAnalyses = analyses.filter((a) => a.user_id === sup.id);
      const operators = [...new Set(supAnalyses.map((a) => a.operador))];

      // Team averages
      const scores = supAnalyses.filter((a) => a.score != null).map((a) => Number(a.score));
      const payments = supAnalyses.filter((a) => a.chance_pagamento != null).map((a) => Number(a.chance_pagamento));
      const risks = supAnalyses.filter((a) => a.risco_quebra != null).map((a) => Number(a.risco_quebra));

      const avgQuality = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      const avgPayment = payments.length > 0 ? Math.round(payments.reduce((a, b) => a + b, 0) / payments.length) : 0;
      const avgRisk = risks.length > 0 ? Math.round(risks.reduce((a, b) => a + b, 0) / risks.length) : 0;

      let improving = 0;
      let worsening = 0;
      let stableCount = 0;
      let noBase = 0;

      operators.forEach((op) => {
        const opAnalyses = supAnalyses.filter((a) => a.operador === op);
        const trend = classifyOperator(opAnalyses, midpoint);
        if (trend === "improving") improving++;
        else if (trend === "worsening") worsening++;
        else if (trend === "no_base") noBase++;
        else stableCount++;
      });

      const withBase = improving + worsening + stableCount;
      const pctImproving = withBase > 0 ? Math.round((improving / withBase) * 100) : 0;
      const pctWorsening = withBase > 0 ? Math.round((worsening / withBase) * 100) : 0;

      // Team trend
      let teamTrend: OperatorTrend;
      if (withBase === 0) {
        teamTrend = "no_base";
      } else if (improving > worsening) {
        teamTrend = "improving";
      } else if (worsening > improving) {
        teamTrend = "worsening";
      } else {
        teamTrend = "stable";
      }

      // Training response rate
      const supTrainings = trainingSessions.filter((t) => t.supervisor_id === sup.id);
      const trainingTotal = supTrainings.length;
      const trainingResponded = supTrainings.filter((t) => t.status === "respondido").length;
      const trainingRate = trainingTotal > 0 ? Math.round((trainingResponded / trainingTotal) * 100) : 0;

      return {
        id: sup.id,
        nome: sup.nome,
        totalOps: operators.length,
        avgQuality,
        avgPayment,
        avgRisk,
        improving,
        worsening,
        noBase,
        pctImproving,
        pctWorsening,
        teamTrend,
        trainingRate,
        trainingTotal,
        totalAnalyses: supAnalyses.length,
      };
    })
      .filter((s) => s.totalAnalyses > 0)
      .sort((a, b) => b.avgQuality - a.avgQuality);
  }, [analyses, trainingSessions, supervisors, periodStart, periodEnd]);

  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Impacto na Equipe por Supervisor
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              O período é dividido ao meio. Score = Qualidade×0,40 + Pagamento×0,35 + (100−Risco)×0,25.
              Variação ≥ +3 = Melhorando, ≤ −3 = Piorando, entre = Estável. Mínimo 1 análise em cada metade.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supervisor</TableHead>
            <TableHead className="text-center">Operadores</TableHead>
            <TableHead className="text-center">Qualidade Equipe</TableHead>
            <TableHead className="text-center">Pagamento Equipe</TableHead>
            <TableHead className="text-center">Risco Equipe</TableHead>
            <TableHead className="text-center">Melhorando</TableHead>
            <TableHead className="text-center">Piorando</TableHead>
            <TableHead className="text-center">Tendência</TableHead>
            <TableHead className="text-center">Resp. Treinos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-foreground">{r.nome}</TableCell>
              <TableCell className="text-center text-muted-foreground">{r.totalOps}</TableCell>
              <TableCell className="text-center font-bold text-primary">{r.avgQuality}</TableCell>
              <TableCell className="text-center font-bold text-success">{r.avgPayment}%</TableCell>
              <TableCell className="text-center font-bold text-destructive">{r.avgRisk}%</TableCell>
              <TableCell className="text-center">
                <Badge className="bg-success/20 text-success border-0 text-xs">
                  {r.pctImproving}% ({r.improving})
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge className={`border-0 text-xs ${r.worsening > 0 ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {r.pctWorsening}% ({r.worsening})
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {getTrendIcon(r.teamTrend)}
                  <span className={`text-xs font-medium ${
                    r.teamTrend === "improving" ? "text-success" :
                    r.teamTrend === "worsening" ? "text-destructive" :
                    "text-muted-foreground"
                  }`}>
                    {getTrendLabel(r.teamTrend)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className={`font-bold ${r.trainingRate >= 70 ? "text-success" : r.trainingRate >= 40 ? "text-warning" : "text-destructive"}`}>
                  {r.trainingRate}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">({r.trainingTotal})</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
