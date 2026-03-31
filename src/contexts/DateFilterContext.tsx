import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { startOfDay, subDays, startOfMonth, endOfDay } from "date-fns";

export type DatePreset = "today" | "yesterday" | "7d" | "30d" | "this_month" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterContextValue {
  preset: DatePreset;
  range: DateRange;
  setPreset: (preset: DatePreset) => void;
  setCustomRange: (from: Date, to: Date) => void;
  filterByDate: <T extends { created_at: string }>(items: T[]) => T[];
  label: string;
}

const presetLabels: Record<DatePreset, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  this_month: "Este mês",
  custom: "Personalizado",
};

function computeRange(preset: DatePreset, customFrom?: Date, customTo?: Date): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "custom":
      return {
        from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 6)),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
      };
  }
}

const DateFilterContext = createContext<DateFilterContextValue | null>(null);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);

  const setPreset = useCallback((p: DatePreset) => {
    setPresetState(p);
  }, []);

  const setCustomRange = useCallback((from: Date, to: Date) => {
    setCustomFrom(from);
    setCustomTo(to);
    setPresetState("custom");
  }, []);

  const filterByDate = useCallback(<T extends { created_at: string }>(items: T[]): T[] => {
    return items.filter((item) => {
      const d = new Date(item.created_at);
      return d >= range.from && d <= range.to;
    });
  }, [range]);

  const label = useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      return `${customFrom.toLocaleDateString("pt-BR")} — ${customTo.toLocaleDateString("pt-BR")}`;
    }
    return presetLabels[preset];
  }, [preset, customFrom, customTo]);

  return (
    <DateFilterContext.Provider value={{ preset, range, setPreset, setCustomRange, filterByDate, label }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error("useDateFilter must be used within DateFilterProvider");
  return ctx;
}
