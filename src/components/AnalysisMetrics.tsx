import { Bot, Clock, Coins, Hash, Mic } from "lucide-react";

interface AnalysisMetricsProps {
  modelo_usado: string | null;
  tokens_prompt: number | null;
  tokens_resposta: number | null;
  tokens_total: number | null;
  custo_estimado: number | null;
  tempo_resposta: number | null;
  duracao_audio_total: number | null;
}

function MetricItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function AnalysisMetrics({
  modelo_usado,
  tokens_prompt,
  tokens_resposta,
  tokens_total,
  custo_estimado,
  tempo_resposta,
  duracao_audio_total,
}: AnalysisMetricsProps) {
  const hasAnyData = modelo_usado || tokens_total || tempo_resposta;
  if (!hasAnyData) return null;

  const formatCost = (cost: number | null) => {
    if (cost == null) return "—";
    return `R$ ${(cost * 5.5).toFixed(2)}`; // approximate USD to BRL
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds} segundos`;
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Métricas da Análise de IA</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-border">
        <div className="space-y-1">
          <MetricItem icon={Bot} label="Modelo utilizado" value={modelo_usado || "—"} />
          <MetricItem icon={Clock} label="Tempo de resposta" value={tempo_resposta != null ? `${tempo_resposta}s` : "—"} />
          <MetricItem icon={Hash} label="Tokens de entrada" value={tokens_prompt != null ? tokens_prompt.toLocaleString("pt-BR") : "—"} />
          <MetricItem icon={Hash} label="Tokens de saída" value={tokens_resposta != null ? tokens_resposta.toLocaleString("pt-BR") : "—"} />
        </div>
        <div className="space-y-1">
          <MetricItem icon={Hash} label="Tokens totais" value={tokens_total != null ? tokens_total.toLocaleString("pt-BR") : "—"} />
          <MetricItem icon={Mic} label="Duração total do áudio" value={formatDuration(duracao_audio_total)} />
          <MetricItem icon={Coins} label="Custo estimado" value={formatCost(custo_estimado)} />
        </div>
      </div>
    </div>
  );
}
