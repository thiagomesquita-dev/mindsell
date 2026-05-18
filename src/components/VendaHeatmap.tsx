import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface VendaStage {
  key: string;
  label: string;
  score: number;
  description: string;
  tooltipLow: string;
}

const STAGES: Omit<VendaStage, "score">[] = [
  {
    key: "validacao",
    label: "Validação",
    description: "Validação do contexto do cliente, identificação e criação de conexão inicial.",
    tooltipLow: "Isso indica dificuldade da equipe em validar o contexto e estabelecer rapport no início da conversa.",
  },
  {
    key: "exploracao",
    label: "Exploração",
    description: "Exploração da dor e identificação das necessidades e objeções do cliente.",
    tooltipLow: "Isso indica que a equipe não está conseguindo explorar adequadamente a situação e as dores do cliente.",
  },
  {
    key: "necessidade",
    label: "Necessidade",
    description: "Clareza sobre a necessidade e o impacto da solução para o cliente.",
    tooltipLow: "Isso indica dificuldade da equipe em conectar a solução à necessidade real e ao impacto percebido pelo cliente.",
  },
  {
    key: "demonstracao",
    label: "Demonstração",
    description: "Demonstração de valor da proposta e apresentação de argumentos concretos.",
    tooltipLow: "Isso indica que a equipe não está demonstrando valor de forma eficaz, reduzindo a percepção de benefício pelo cliente.",
  },
  {
    key: "acao",
    label: "Ação",
    description: "Condução ao próximo passo e definição clara do compromisso com o cliente.",
    tooltipLow: "Isso indica dificuldade em transformar negociações em compromissos firmes e próximos passos concretos.",
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
  validacao: {
    impacto: "Sem uma validação eficiente do contexto, o cliente não se sente compreendido e a conversa perde relevância desde o início, reduzindo drasticamente as chances de avanço.",
    foco: "Foco imediato: melhorar a abertura com perguntas de contexto, confirmação de identidade e criação de conexão genuína com o cliente.",
  },
  exploracao: {
    impacto: "Quando a dor do cliente não é explorada adequadamente, as objeções ficam sem resposta e o cliente não percebe que a solução é relevante para sua situação.",
    foco: "Foco imediato: reforçar técnicas de escuta ativa, perguntas abertas e mapeamento das dores e objeções antes de apresentar qualquer proposta.",
  },
  necessidade: {
    impacto: "Mesmo quando o cliente demonstra interesse, a falta de clareza sobre necessidade e impacto faz com que ele não se convença da urgência da solução.",
    foco: "Foco imediato: treinar a equipe para conectar a solução às consequências reais da inação e ao impacto positivo da mudança para o cliente.",
  },
  demonstracao: {
    impacto: "A demonstração de valor fraca faz com que o cliente não perceba diferencial na proposta, aumentando a resistência e reduzindo a taxa de conversão.",
    foco: "Foco imediato: reforçar argumentação com evidências concretas, casos de sucesso e ancoragem de valor antes de apresentar o preço ou condições.",
  },
  acao: {
    impacto: "A negociação avança bem até o final, mas a falta de um encaminhamento claro faz com que oportunidades viáveis sejam perdidas por ausência de comprometimento do cliente.",
    foco: "Foco imediato: implementar técnicas de fechamento consultivo, confirmação do próximo passo e definição clara do compromisso assumido.",
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
    return `A operação apresenta desempenho consistente em todas as etapas do funil VENDA, com média geral de ${avg.toFixed(1)}/10. Isso indica maturidade na condução das negociações. Recomendação: manter o padrão atual e buscar excelência nos pontos de maior volume.`;
  }

  const lines: string[] = [];

  const goodStages = active.filter((e) => e.score >= 7.5);
  if (goodStages.length > 0) {
    const names = goodStages.map((s) => s.label).join(" e ");
    lines.push(`A operação apresenta desempenho consistente nas etapas de ${names}, mas há uma quebra clara na fase de ${worst.label} (${worst.score.toFixed(1)}/10).`);
  } else {
    lines.push(`A operação apresenta dificuldades generalizadas, com a etapa mais crítica sendo ${worst.label} (${worst.score.toFixed(1)}/10).`);
  }

  const impact = STAGE_IMPACT[worst.key];
  if (impact) {
    lines.push(impact.impacto);
    lines.push(impact.foco);
  }

  return lines.join("\n\n");
}

type AnalysisVenda = {
  venda_validacao: unknown;
  venda_exploracao: unknown;
  venda_necessidade: unknown;
  venda_demonstracao: unknown;
  venda_acao: unknown;
};

interface VendaHeatmapProps {
  analyses: AnalysisVenda[];
  previousWeekAnalyses?: AnalysisVenda[];
}

function extractNota(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const nota = obj.nota;
  if (nota == null) return null;
  const n = Number(nota);
  return isNaN(n) ? null : n;
}

function computeScores(items: AnalysisVenda[]): Record<string, number> {
  const fieldMap: Record<string, keyof AnalysisVenda> = {
    validacao: "venda_validacao",
    exploracao: "venda_exploracao",
    necessidade: "venda_necessidade",
    demonstracao: "venda_demonstracao",
    acao: "venda_acao",
  };
  const result: Record<string, number> = {};
  for (const key of Object.keys(fieldMap)) {
    const field = fieldMap[key];
    const notas = items.map((a) => extractNota(a[field])).filter((n): n is number => n !== null);
    result[key] = notas.length > 0 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : 0;
  }
  return result;
}

export function VendaHeatmap({ analyses, previousWeekAnalyses = [] }: VendaHeatmapProps) {
  const scores = computeScores(analyses);
  const prevScores = computeScores(previousWeekAnalyses);
  const hasPrevData = previousWeekAnalyses.length > 0;

  const diagnostic = generateDiagnostic(scores);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {STAGES.map((stage) => {
          const score = scores[stage.key] ?? 0;
          const prevScore = prevScores[stage.key] ?? 0;
          const delta =
            hasPrevData && score > 0 && prevScore > 0
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
                    {score > 0 ? (
                      <>
                        {score.toFixed(1)}
                        <span className="text-lg font-semibold text-muted-foreground">/10</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>

                  <span className={`text-xs font-semibold ${colors.text} uppercase tracking-wide`}>
                    {score > 0 ? perfLabel : "Sem dados"}
                  </span>

                  {delta !== null && (
                    <p
                      className={`text-xs font-semibold mt-2 ${
                        delta > 0
                          ? "text-emerald-400"
                          : delta < 0
                          ? "text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {delta > 0
                        ? `↑ +${delta.toFixed(1)}`
                        : delta < 0
                        ? `↓ ${delta.toFixed(1)}`
                        : "— igual"}{" "}
                      vs semana passada
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
              <p
                key={i}
                className={`text-sm font-body leading-relaxed ${
                  i === diagnostic.split("\n\n").length - 1
                    ? "text-primary font-semibold"
                    : "text-foreground/90"
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
