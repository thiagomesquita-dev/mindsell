import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ContentType } from "recharts/types/component/Tooltip";
import { EnrichedBarTooltip } from "@/components/EnrichedBarTooltip";
import type { ChartType } from "@/lib/tooltipDescriptions";

interface DashboardChartProps {
  title: string;
  data: Record<string, unknown>[];
  dataKey?: string;
  color: string;
  tooltipContent?: ContentType<number, string>;
  chartType?: ChartType;
}

export function DashboardChart({ data, dataKey = "name", color, tooltipContent, chartType }: DashboardChartProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey={dataKey} tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} width={180} axisLine={false} tickLine={false} />
          {tooltipContent ? (
            <Tooltip content={tooltipContent} />
          ) : chartType ? (
            <Tooltip content={({ active, payload }) => (
              <EnrichedBarTooltip active={active} payload={payload as any} chartType={chartType} nameKey={dataKey} />
            )} />
          ) : (
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: "8px" }} />
          )}
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => <Cell key={i} fill={color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
