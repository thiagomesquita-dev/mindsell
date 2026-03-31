import { useMemo } from "react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TrainingSession {
  id: string;
  operador: string;
  created_at: string;
  nota_final: number | null;
  status: string;
  origem: string;
}

interface Props {
  operators: string[];
  trainingSessions: TrainingSession[];
  weeksToShow?: number;
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
  responded: number;
  pending: number;
  sessions: TrainingSession[];
  avgNota: number | null;
}

function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function generateWeeks(count: number): WeekDef[] {
  const weeks: WeekDef[] = [];
  const now = new Date();
  const currentMonday = getWeekMonday(now);

  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(currentMonday);
    start.setDate(currentMonday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    weeks.push({
      key: start.toISOString(),
      label: `${startStr} a ${endStr}`,
      shortLabel: `${startStr}–${endStr}`,
      start,
      end,
    });
  }

  // Limit to the most recent 'count' weeks, filtering out future weeks
  const today = new Date();
  const pastWeeks = weeks.filter(w => w.start <= today);
  return pastWeeks.slice(-count);
}

function getCellColor(count: number): string {
  if (count === 0) return "bg-destructive/20 border-destructive/30";
  if (count === 1) return "bg-yellow-500/20 border-yellow-500/30";
  return "bg-green-500/20 border-green-500/30";
}

function getCellTextColor(count: number): string {
  if (count === 0) return "text-destructive";
  if (count === 1) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

export function TrainingWeeklyMatrix({ operators, trainingSessions, weeksToShow = 8 }: Props) {
  const weeks = useMemo(() => generateWeeks(weeksToShow), [weeksToShow]);

  const matrix = useMemo(() => {
    const m = new Map<string, Map<string, CellData>>();

    operators.forEach((op) => {
      const weekMap = new Map<string, CellData>();
      weeks.forEach((w) => weekMap.set(w.key, { count: 0, responded: 0, pending: 0, sessions: [], avgNota: null }));
      m.set(op, weekMap);
    });

    trainingSessions.forEach((s) => {
      const monday = getWeekMonday(new Date(s.created_at));
      const weekKey = monday.toISOString();
      const opMap = m.get(s.operador);
      if (!opMap) return;
      const cell = opMap.get(weekKey);
      if (!cell) return;
      cell.count++;
      cell.sessions.push(s);
      if (s.status === "respondido" || s.status === "avaliado") {
        cell.responded++;
      } else {
        cell.pending++;
      }
    });

    m.forEach((weekMap) => {
      weekMap.forEach((cell) => {
        if (cell.sessions.length > 0) {
          const notas = cell.sessions.filter((s) => s.nota_final != null).map((s) => s.nota_final!);
          cell.avgNota = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
        }
      });
    });

    return m;
  }, [operators, trainingSessions, weeks]);

  if (operators.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        Nenhum operador encontrado.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
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
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => {
                const weekMap = matrix.get(op)!;
                return (
                  <tr key={op} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2 font-medium text-foreground whitespace-nowrap">
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
                                    ? "Nenhum treinamento"
                                    : `${cell.count} treinamento${cell.count > 1 ? "s" : ""}`}
                                </p>
                                {cell.count > 0 && (
                                  <div className="text-xs space-y-0.5">
                                    <p className="text-green-600 dark:text-green-400">
                                      ✓ {cell.responded} respondido{cell.responded !== 1 ? "s" : ""}
                                    </p>
                                    <p className="text-yellow-600 dark:text-yellow-400">
                                      ◷ {cell.pending} pendente{cell.pending !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                )}
                                {cell.avgNota != null && (
                                  <p className="text-xs">
                                    Nota média: <strong>{cell.avgNota.toFixed(1)}</strong>
                                  </p>
                                )}
                                {cell.sessions.length > 0 && (
                                  <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                                    {cell.sessions.slice(0, 4).map((s, i) => (
                                      <div key={i}>
                                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                                        {" — "}
                                        <span className={s.status === "respondido" || s.status === "avaliado" ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                                          {s.status === "respondido" || s.status === "avaliado" ? "respondido" : "pendente"}
                                        </span>
                                        {s.nota_final != null && ` (${s.nota_final})`}
                                      </div>
                                    ))}
                                    {cell.sessions.length > 4 && (
                                      <div>+{cell.sessions.length - 4} mais...</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border bg-destructive/20 border-destructive/30" />
          <span>0 treinos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border bg-yellow-500/20 border-yellow-500/30" />
          <span>1 treino</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border bg-green-500/20 border-green-500/30" />
          <span>2+ treinos</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
