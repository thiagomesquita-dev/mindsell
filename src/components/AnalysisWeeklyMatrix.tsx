import React, { useMemo, ReactNode } from "react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AnalysisRow {
  id: string;
  operador: string;
  score: number | null;
  created_at: string;
}

interface Props {
  operators: string[];
  analyses: AnalysisRow[];
  referenceDate?: Date;
  minAnalyses?: number;
  onSelectOperator?: (name: string) => void;
  selectedOperator?: string | null;
  renderExpansion?: (operatorName: string) => ReactNode;
}

interface WeekDef {
  key: string;
  label: string;
  shortLabel: string;
  start: Date;
  end: Date;
}

interface CellData {
  count: number;
  analyses: AnalysisRow[];
  avgScore: number | null;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateMonthWeeks(refDate: Date): WeekDef[] {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const now = new Date();

  const weeks: WeekDef[] = [];
  let current = getWeekMonday(firstDay);

  while (current <= lastDay) {
    if (current > now) break;

    const start = new Date(current);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const startStr = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    weeks.push({
      key: start.toISOString(),
      label: `${startStr} a ${endStr}`,
      shortLabel: `${startStr}–${endStr}`,
      start,
      end,
    });

    current = new Date(start);
    current.setDate(start.getDate() + 7);
  }

  // Limit to the 4 most recent weeks
  return weeks.slice(-4);
}

function getCellColor(count: number): string {
  if (count === 0) return "bg-destructive/20 border-destructive/30";
  if (count <= 2) return "bg-yellow-500/20 border-yellow-500/30";
  return "bg-green-500/20 border-green-500/30";
}

function getCellTextColor(count: number): string {
  if (count === 0) return "text-destructive";
  if (count <= 2) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

export function AnalysisWeeklyMatrix({
  operators,
  analyses,
  referenceDate,
  minAnalyses = 3,
  onSelectOperator,
  selectedOperator,
  renderExpansion,
}: Props) {
  const refDate = referenceDate ?? new Date();
  const weeks = useMemo(() => generateMonthWeeks(refDate), [refDate.getFullYear(), refDate.getMonth()]);

  const monthLabel = refDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const monthStart = weeks.length > 0 ? weeks[0].start : new Date();
  const monthEnd = weeks.length > 0 ? weeks[weeks.length - 1].end : new Date();

  const filteredAnalyses = useMemo(() => {
    return analyses.filter((a) => {
      const d = new Date(a.created_at);
      return d >= monthStart && d <= monthEnd;
    });
  }, [analyses, monthStart.getTime(), monthEnd.getTime()]);

  const { matrix, totals } = useMemo(() => {
    const m = new Map<string, Map<string, CellData>>();
    const t = new Map<string, number>();

    operators.forEach((op) => {
      const weekMap = new Map<string, CellData>();
      weeks.forEach((w) => weekMap.set(w.key, { count: 0, analyses: [], avgScore: null }));
      m.set(op, weekMap);
      t.set(op, 0);
    });

    filteredAnalyses.forEach((a) => {
      const monday = getWeekMonday(new Date(a.created_at));
      const weekKey = monday.toISOString();
      const opMap = m.get(a.operador);
      if (!opMap) return;
      const cell = opMap.get(weekKey);
      if (!cell) return;
      cell.count++;
      cell.analyses.push(a);
      t.set(a.operador, (t.get(a.operador) || 0) + 1);
    });

    m.forEach((weekMap) => {
      weekMap.forEach((cell) => {
        if (cell.analyses.length > 0) {
          const scores = cell.analyses.filter((a) => a.score != null).map((a) => a.score!);
          cell.avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        }
      });
    });

    return { matrix: m, totals: t };
  }, [operators, filteredAnalyses, weeks]);

  if (operators.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        Nenhum operador encontrado.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground capitalize">
          Período: <span className="font-medium text-foreground">{monthLabel}</span>
        </p>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-medium text-muted-foreground min-w-[160px]">
                    Operador
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w.key}
                      className="px-2 py-3 text-center font-medium text-muted-foreground min-w-[90px]"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs leading-tight cursor-default">{w.shortLabel}</div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Semana: {w.label}
                        </TooltipContent>
                      </Tooltip>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[64px]">
                    Total
                  </th>
                  <th className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[80px]">
                    Status
                  </th>
                  {onSelectOperator && (
                    <th className="px-3 py-3 text-center font-medium text-muted-foreground min-w-[80px]">
                      Ação
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => {
                  const weekMap = matrix.get(op)!;
                  const total = totals.get(op) || 0;
                  const isApt = total >= minAnalyses;
                  const isSelected = selectedOperator === op;
                  const colCount = weeks.length + 3 + (onSelectOperator ? 1 : 0);

                  return (
                    <React.Fragment key={op}>
                      <tr className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", isSelected && "bg-primary/10 border-primary/20")}>
                        <td
                          className={cn(
                            "sticky left-0 z-10 px-4 py-2 font-medium whitespace-nowrap",
                            isSelected ? "bg-primary/10" : "bg-card",
                            onSelectOperator ? "cursor-pointer hover:text-primary text-foreground" : "text-foreground"
                          )}
                          onClick={() => onSelectOperator?.(op)}
                        >
                          {op}
                        </td>
                        {weeks.map((w) => {
                          const cell = weekMap.get(w.key)!;
                          return (
                            <td key={w.key} className="px-2 py-2 text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "mx-auto w-9 h-9 rounded-lg border flex items-center justify-center cursor-default transition-transform hover:scale-110",
                                      getCellColor(cell.count)
                                    )}
                                  >
                                    <span className={cn("text-xs font-bold", getCellTextColor(cell.count))}>
                                      {cell.count}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px]">
                                  <div className="space-y-1">
                                    <p className="font-semibold">{op}</p>
                                    <p className="text-xs text-muted-foreground">{w.label}</p>
                                    <p className="text-xs">
                                      {cell.count === 0
                                        ? "Nenhuma análise"
                                        : `${cell.count} análise${cell.count > 1 ? "s" : ""}`}
                                    </p>
                                    {cell.avgScore != null && (
                                      <p className="text-xs">
                                        Qualidade média: <strong>{cell.avgScore.toFixed(0)}</strong>
                                      </p>
                                    )}
                                    {cell.analyses.length > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                        {cell.analyses.slice(0, 5).map((a, i) => (
                                          <div key={i}>
                                            {new Date(a.created_at).toLocaleDateString("pt-BR")}
                                            {a.score != null && ` — score ${a.score}`}
                                          </div>
                                        ))}
                                        {cell.analyses.length > 5 && (
                                          <div>+{cell.analyses.length - 5} mais...</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center">
                          <span className="font-semibold text-foreground">{total}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge
                            variant={isApt ? "default" : "outline"}
                            className={cn(
                              "text-xs",
                              isApt
                                ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/30"
                                : "text-muted-foreground"
                            )}
                          >
                            {isApt ? "Apto" : "Pendente"}
                          </Badge>
                        </td>
                        {onSelectOperator && (
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => onSelectOperator(op)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                              {isSelected ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Ocultar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                  Ver evolução
                                </>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                      {isSelected && renderExpansion && (
                        <tr className="border-b border-primary/20">
                          <td colSpan={colCount} className="p-0">
                            <div className="bg-muted/30 border-t border-primary/10 p-6">
                              {renderExpansion(op)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-destructive/20 border-destructive/30" />
            <span>0 análises</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-yellow-500/20 border-yellow-500/30" />
            <span>1–2 análises</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border bg-green-500/20 border-green-500/30" />
            <span>3+ análises</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
