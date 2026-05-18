import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, TrendingDown, Info } from "lucide-react";

interface Analysis {
  operador: string;
  carteira: string;
  score: number | null;
  created_at: string;
}

interface TrainingSession {
  operador: string;
  status: string;
  nota_final: number | null;
}

interface Props {
  analyses: Analysis[];
  trainingSessions: TrainingSession[];
}

interface UrgentOperator {
  operador: string;
  carteira: string;
  urgencyScore: number;
  reasons: string[];
  avgQuality: number;
  trend: "improving" | "stable" | "worsening";
  pendingTrainings: number;
  criticalNotes: number;
}

function calcTrend(items: { score: number; date: number }[]): "improving" | "stable" | "worsening" {
  if (items.length < 4) return "stable";
  const sorted = [...items].sort((a, b) => a.date - b.date);
  const mid = Math.floor(sorted.length / 2);
  const avg1 = sorted.slice(0, mid).reduce((s, i) => s + i.score, 0) / mid;
  const avg2 = sorted.slice(mid).reduce((s, i) => s + i.score, 0) / (sorted.length - mid);
  const diff = avg2 - avg1;
  if (diff > 0.3) return "improving";
  if (diff < -0.3) return "worsening";
  return "stable";
}

export function UrgentTrainingBlock({ analyses, trainingSessions }: Props) {
  const urgentOperators = useMemo(() => {
    // Group analyses by operator+carteira
    const opMap: Record<string, { scores: { score: number; date: number }[]; carteira: string }> = {};

    for (const a of analyses) {
      if (a.score == null) continue;
      const key = `${a.operador}__${a.carteira}`;
      if (!opMap[key]) opMap[key] = { scores: [], carteira: a.carteira };
      opMap[key].scores.push({ score: Number(a.score), date: new Date(a.created_at).getTime() });
    }

    // Group trainings by operator
    const trainingMap: Record<string, { pending: number; critical: number }> = {};
    for (const t of trainingSessions) {
      if (!trainingMap[t.operador]) trainingMap[t.operador] = { pending: 0, critical: 0 };
      if (t.status === "pendente") trainingMap[t.operador].pending++;
      if (t.status === "respondido" && t.nota_final != null && t.nota_final < 5) trainingMap[t.operador].critical++;
    }

    const results: UrgentOperator[] = [];

    for (const [key, data] of Object.entries(opMap)) {
      const [operador] = key.split("__");
      const scores = data.scores.map((s) => s.score);
      const avgQuality = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      const trend = calcTrend(data.scores);
      const training = trainingMap[operador] || { pending: 0, critical: 0 };

      let urgencyScore = 0;
      const reasons: string[] = [];

      // Low quality
      if (avgQuality < 5) {
        urgencyScore += 30;
        reasons.push("Qualidade média crítica");
      } else if (avgQuality < 6.5) {
        urgencyScore += 15;
        reasons.push("Qualidade média baixa");
      }

      // Worsening trend
      if (trend === "worsening") {
        urgencyScore += 25;
        reasons.push("Tendência de piora");
      }

      // Critical training notes
      if (training.critical > 0) {
        urgencyScore += 20;
        reasons.push(`${training.critical} nota${training.critical > 1 ? "s" : ""} crítica${training.critical > 1 ? "s" : ""} em treinos`);
      }

      // Pending trainings
      if (training.pending > 0) {
        urgencyScore += 10;
        reasons.push(`${training.pending} treino${training.pending > 1 ? "s" : ""} pendente${training.pending > 1 ? "s" : ""}`);
      }

      if (urgencyScore >= 15) {
        results.push({
          operador,
          carteira: data.carteira,
          urgencyScore,
          reasons,
          avgQuality,
          trend,
          pendingTrainings: training.pending,
          criticalNotes: training.critical,
        });
      }
    }

    return results.sort((a, b) => b.urgencyScore - a.urgencyScore).slice(0, 5);
  }, [analyses, trainingSessions]);

  if (urgentOperators.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="bg-card border border-destructive/30 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-heading text-base font-semibold text-foreground">
            Operadores que precisam de treino urgente
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Top 5 operadores com maior urgência de treinamento, baseado em qualidade baixa,
                tendência de piora, notas críticas e treinos pendentes.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {urgentOperators.map((op) => (
            <div
              key={`${op.operador}-${op.carteira}`}
              className="bg-secondary/50 border border-border rounded-lg p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-sm text-foreground uppercase truncate">
                  {op.operador}
                </span>
                {op.trend === "worsening" && <TrendingDown className="h-4 w-4 text-destructive shrink-0" />}
              </div>
              <span className="text-xs text-muted-foreground">{op.carteira}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Qualidade:</span>
                <span className={`text-sm font-bold ${op.avgQuality < 5 ? "text-destructive" : op.avgQuality < 6.5 ? "text-warning" : "text-foreground"}`}>
                  {op.avgQuality}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {op.reasons.map((r, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
