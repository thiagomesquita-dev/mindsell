import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MetricExplanationModal } from "@/components/MetricExplanationModal";
import { Info } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  tooltip?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  metricKey?: string;
  modalData?: {
    title: string;
    description: string;
    weights: { label: string; weight: string }[];
  };
}

export function KpiCard({ title, value, tooltip, icon, trend, modalData }: KpiCardProps) {
  return (
    <div className="bg-card border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-body">{title}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-secondary text-foreground border-border whitespace-pre-line">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {modalData && (
            <MetricExplanationModal
              title={modalData.title}
              description={modalData.description}
              weights={modalData.weights}
            />
          )}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
      {trend && (
        <p className={`text-xs mt-2 ${trend.positive ? "text-success" : "text-destructive"}`}>
          {trend.value}
        </p>
      )}
    </div>
  );
}
