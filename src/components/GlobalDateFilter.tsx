import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDateFilter, type DatePreset } from "@/contexts/DateFilterContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const presets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "this_month", label: "Este mês" },
];

export function GlobalDateFilter() {
  const { preset, range, setPreset, setCustomRange } = useDateFilter();
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(range.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(range.to);

  const handlePreset = (p: DatePreset) => {
    setPreset(p);
    setCustomMode(false);
    setOpen(false);
  };

  const handleApplyCustom = () => {
    if (tempFrom && tempTo) {
      setCustomRange(tempFrom, tempTo);
      setOpen(false);
      setCustomMode(false);
    }
  };

  const displayLabel = preset === "custom"
    ? `${format(range.from, "dd/MM/yy")} — ${format(range.to, "dd/MM/yy")}`
    : presets.find((p) => p.value === preset)?.label || "Período";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-2 text-xs font-medium border-border bg-secondary/50 hover:bg-secondary",
            preset !== "30d" && "border-primary/50 text-primary"
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!customMode ? (
          <div className="p-2 space-y-1 min-w-[180px]">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePreset(p.value)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  preset === p.value
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-secondary text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => {
                setTempFrom(range.from);
                setTempTo(range.to);
                setCustomMode(true);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                preset === "custom"
                  ? "bg-primary/10 text-primary font-medium"
                  : "hover:bg-secondary text-foreground"
              )}
            >
              Personalizado...
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Data inicial</p>
            <Calendar
              mode="single"
              selected={tempFrom}
              onSelect={(d) => d && setTempFrom(d)}
              disabled={(d) => d > new Date()}
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
            <p className="text-xs font-medium text-muted-foreground">Data final</p>
            <Calendar
              mode="single"
              selected={tempTo}
              onSelect={(d) => d && setTempTo(d)}
              disabled={(d) => d > new Date() || (tempFrom ? d < tempFrom : false)}
              className={cn("p-3 pointer-events-auto")}
              locale={ptBR}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomMode(false)} className="flex-1">
                Voltar
              </Button>
              <Button size="sm" onClick={handleApplyCustom} className="flex-1" disabled={!tempFrom || !tempTo}>
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
