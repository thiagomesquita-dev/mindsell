import { getTooltipMeta, type ChartType } from "@/lib/tooltipDescriptions";

interface TooltipPayload {
  payload: Record<string, unknown>;
  value: number;
}

interface EnrichedBarTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  chartType: ChartType;
  nameKey?: string;
}

export function EnrichedBarTooltip({ active, payload, chartType, nameKey = "name" }: EnrichedBarTooltipProps) {
  if (!active || !payload?.length) return null;

  const entry = payload[0].payload;
  const name = String(entry[nameKey] || "");
  const value = Number(payload[0].value) || 0;
  const meta = getTooltipMeta(chartType, name);
  const title = (entry.fullDescription as string) || name;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl max-w-xs space-y-1">
      <p className="font-heading font-semibold text-foreground text-sm">{title}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">{meta.descricao}</p>
      <p className="text-xs text-foreground font-medium">
        Ocorrências: <span className="font-bold text-primary">{value}</span>
      </p>
    </div>
  );
}