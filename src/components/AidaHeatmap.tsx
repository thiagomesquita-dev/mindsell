import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface AidaStage {
  key: string;
  label: string;
  score: number;
  description: string;
  tooltipLow: string;
}

const STAGES: Omit<AidaStage, "score">[] = [
  {
    key: "atencao",
    label: "Atenção",
    description: "Abertura da negociação, validação de identidade e criação de conexão inicial.",
    tooltipLow: "Isso indica dificuldade da equipe na abertura e criação de rapport com o cliente.",
  },
  {
    key: "interesse",
    label: "Interesse",
    description: "Explicação da situação e apresentação da proposta inicial.",
    tooltipLow: "Isso indica que a equipe não está conseguindo engajar o cliente na proposta apresentada.",
  },
  {
    key: "desejo",
    label: "Desejo",
    description: "Tratamento de objeções e adaptação da negociação ao cliente.",
    tooltipLow: "Isso indica dificuldade da equipe em tratar objeções dos clientes.",
  },
  {
    key: "acao",
    label: "Ação",
    description: "Fechamento da negociação e definição clara do compromisso.",
    tooltipLow: "Isso indica dificuldade em transformar negociações em compromissos firmes.",
  },
];

function getHeatColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 7.5) return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" };
  if (score >= 6.0) return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" };
  return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" };
}

function getPerformanceLabel(score: number): string {
  if (score >= 7.5) return "Bom";
  if (score >= 6.0) return "Atenção";
  return "Crítico";
}

const STAGE_IMPACT: Record<string, { impacto: string; foco: string }> = {
  atencao: {
    impacto: "Sem uma abertura eficiente, o cliente não se engaja e a negociação perde força desde o início, reduzindo drasticamente as chances de acordo.",
    foco: "Foco imediato: melhorar a abertura com validação de identidade, contexto claro e criação de conexão inicial com o cliente.",
  },
  interesse: {
    impacto: "Quando o cliente não percebe valor na proposta apresentada, ele tende a encerrar a conversa antes mesmo de considerar as condições, desperdiçando oportunidades viáveis.",
    foco: "Foco imediato: reforçar ancoragem de valor, apresentação clara das condições e uso de economia como argumento central.",
  },
  desejo: {
    impacto: "Mesmo quando o cliente demonstra interesse, a equipe não consegue converter esse interesse em compromisso, aumentando o risco de desistência e quebra de acordo.",
    foco: "Foco imediato: reforçar treino em tratamento de objeções, reformulação de proposta e condução para fechamento.",
  },
  acao: {
    impacto: "A negociação avança bem até o final, mas a falta de um fechamento claro faz com que acordos viáveis sejam perdidos por ausência de compromisso firme do cliente.",
    foco: "Foco imediato: implementar técnicas de fechamento presumido, confirmação de compromisso e encaminhamento claro do próximo passo.",
  },
};

function generateDiagnostic(scores: Record<string, number>): string {
  const entries = STAGES.map((s) => ({ ...s, score: scores[s.key] ?? 0 }));
  const active = entries.filter((e) => e.score > 0);
  if (active.length === 0) return "";

  const best = active.reduce((a, b) => (a.score >= b.score ? a : b));
  const worst = active.reduce((a, b) => (a.score <= b.score ? a : b));
  const avg = active.reduce((sum, e) => sum + e.score, 0) / active.length;

  // All stages performing well
  if (worst.score >= 7.5) {
    return `A operação apresenta desempenho consistente em todas as etapas do funil, com média geral de ${avg.toFixed(1)}/10. Isso indica maturidade na condução das negociações. Recomendação: manter o padrão atual e buscar excelência nos pontos de maior volume.`;
  }

  // Build strategic diagnostic
  const lines: string[] = [];

  // 1. Situação atual
  const goodStages = active.filter((e) => e.score >= 7.5);
  if (goodStages.length > 0) {
    const names = goodStages.map((s) => s.label).join(" e ");
    lines.push(`A operação apresenta desempenho consistente nas etapas de ${names}, mas há uma quebra clara na fase de ${worst.label} (${worst.score.toFixed(1)}/10).`);
  } else {
    lines.push(`A operação apresenta dificuldades generalizadas, com a etapa mais crítica sendo ${worst.label} (${worst.score.toFixed(1)}/10).`);
  }

  // 2. Impacto
  const impact = STAGE_IMPACT[worst.key];
  if (impact) {
    lines.push(impact.impacto);
  }

  // 3. Direcionamento
  if (impact) {
    lines.push(impact.foco);
  }

  return lines.join("\n\n");
}

type AnalysisAida = { aida_atencao: unknown; aida_interesse: unknown; aida_desejo: unknown; aida_acao: unknown };

interface AidaHeatmapProps {
  analyses: AnalysisAida[];
  previousWeekAnalyses?: AnalysisAida[];
}

function extractNota(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const nota = obj.nota;
  if (nota == null) return null;
  const n = Number(nota);
  return isNaN(n) ? null : n;
}

function computeScores(items: AnalysisAida[]): Record<string, number> {
  const fieldMap: Record<string, keyof AnalysisAida> = {
    atencao: "aida_atencao",
    interesse: "aida_interesse",
    desejo: "aida_desejo",
    acao: "aida_acao",
  };
  const result: Record<string, number> = {};
  for (const key of Object.keys(fieldMap)) {
    const field = fieldMap[key];
    const notas = items.map((a) => extractNota(a[field])).filter((n): n is number => n !== null);
    result[key] = notas.length > 0 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : 0;
  }
  return result;
}

export function AidaHeatmap({ analyses, previousWeekAnalyses = [] }: AidaHeatmapProps) {
  const scores = computeScores(analyses);
  const prevScores = computeScores(previousWeekAnalyses);
  const hasPrevData = previousWeekAnalyses.length > 0;

  const diagnostic = generateDiagnostic(scores);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const score = scores[stage.key] ?? 0;
          const prevScore = prevScores[stage.key] ?? 0;
          const delta = hasPrevData && score > 0 && prevScore > 0
            ? Math.round((score - prevScore) * 10) / 10
            : null;
          const colors = getHeatColor(score);
          const perfLabel = getPerformanceLabel(score);
          const isLow = score < 7.5;

          return (
            <Tooltip key={stage.key}>
              <TooltipTrigger asChild>
                <div
                  className={`relative rounded-xl border ${colors.border} ${colors.bg} p-5 transition-all hover:scale-[1.02] cursor-default`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">
                      {stage.label}
                    </h3>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <p className={`text-4xl font-heading font-bold ${colors.text} mb-1`}>
                    {score > 0 ? <>{score.toFixed(1)}<span className="text-lg font-semibold text-muted-foreground">/10</span></> : "—"}
                  </p>

                  <span className={`text-xs font-semibold ${colors.text} uppercase tracking-wide`}>
                    {score > 0 ? perfLabel : "Sem dados"}
                  </span>

                  {delta !== null && (
                    <p className={`text-xs font-semibold mt-2 ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {delta > 0 ? `↑ +${delta.toFixed(1)}` : delta < 0 ? `↓ ${delta.toFixed(1)}` : "— igual"} vs semana passada
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed font-body">
                    {stage.description}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs bg-secondary text-foreground border-border">
                <p className="text-xs font-body">
                  {isLow && score > 0
                    ? `A etapa ${stage.label} está abaixo do ideal (${score.toFixed(1)}/10). ${stage.tooltipLow}`
                    : score >= 7.5
                      ? `A etapa ${stage.label} apresenta boa performance na operação (${score.toFixed(1)}/10).`
                      : `Ainda não há dados suficientes para avaliar esta etapa.`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {diagnostic && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Diagnóstico Estratégico
          </p>
          <div className="space-y-3">
            {diagnostic.split("\n\n").map((paragraph, i) => (
              <p key={i} className={`text-sm font-body leading-relaxed ${i === diagnostic.split("\n\n").length - 1 ? "text-primary font-semibold" : "text-foreground/90"}`}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
