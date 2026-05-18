import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type OperatorStatusOption = "ativos" | "ativos_inativos" | "inativos";

const labels: Record<OperatorStatusOption, string> = {
  ativos: "Somente ativos",
  ativos_inativos: "Ativos + inativos",
  inativos: "Somente inativos",
};

interface OperatorStatusFilterProps {
  value: OperatorStatusOption;
  onChange: (v: OperatorStatusOption) => void;
  className?: string;
}

export function OperatorStatusFilter({ value, onChange, className }: OperatorStatusFilterProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</span>
      <Select value={value} onValueChange={(v) => onChange(v as OperatorStatusOption)}>
        <SelectTrigger className="w-[180px] bg-secondary border-border text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {(Object.keys(labels) as OperatorStatusOption[]).map((opt) => (
            <SelectItem key={opt} value={opt} className="text-sm">
              {labels[opt]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Filter analyses based on operator status.
 * @param analyses - Array of items with `operador` and optionally `carteira`
 * @param operators - Array of operator records with `nome`, `carteira`, `status`
 * @param statusFilter - The selected filter option
 * @returns Filtered analyses
 */
export function filterByOperatorStatus<
  T extends { operador: string; carteira?: string },
>(
  analyses: T[],
  operators: { nome: string; carteira: string; status: string }[],
  statusFilter: OperatorStatusOption,
): T[] {
  if (statusFilter === "ativos_inativos") return analyses;

  return analyses.filter((a) => {
    const op = operators.find(
      (o) => o.nome === a.operador && (!a.carteira || o.carteira === a.carteira),
    );
    // If operator not found in DB, treat as active (legacy data)
    if (!op) return statusFilter === "ativos";
    if (statusFilter === "ativos") return op.status === "ativo";
    if (statusFilter === "inativos") return op.status === "inativo";
    return true;
  });
}
