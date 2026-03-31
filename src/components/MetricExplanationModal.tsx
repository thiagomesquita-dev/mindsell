import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface WeightItem {
  label: string;
  weight: string;
}

interface MetricExplanationModalProps {
  title: string;
  description: string;
  weights: WeightItem[];
  trigger?: React.ReactNode;
}

export function MetricExplanationModal({ title, description, weights, trigger }: MetricExplanationModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <button className="text-[10px] text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors">
            Ver cálculo
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            {weights.map((w, i) => (
              <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-2.5">
                <span className="text-sm text-foreground">{w.label}</span>
                <span className="text-sm font-semibold text-primary">{w.weight}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
