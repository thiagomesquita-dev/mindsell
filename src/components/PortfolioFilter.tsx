import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PortfolioFilterProps {
  carteiras: string[];
  selected: string;
  onSelect: (value: string) => void;
  showAllOption: boolean;
}

export function PortfolioFilter({ carteiras, selected, onSelect, showAllOption }: PortfolioFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Carteira:</span>
      <Select value={selected} onValueChange={onSelect}>
        <SelectTrigger className="w-52 bg-secondary border-border text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {showAllOption && (
            <SelectItem value="Todas" className="text-sm">Todas</SelectItem>
          )}
          {carteiras.map((c) => (
            <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
