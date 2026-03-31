import { useState } from "react";
import { ArrowRight, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const APP_URL = "https://app.cobramind.ia.br";
const PLAN_PRICE = 1497;

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getDynamicMessage(ganho: number) {
  if (ganho < 1500)
    return "Mesmo com uma melhoria conservadora, o CobraMind já ajuda a reduzir perdas.";
  if (ganho <= 6000)
    return "O CobraMind já se paga e começa a gerar retorno real para a operação.";
  return "O impacto na operação pode ser significativo, com aumento direto no resultado financeiro.";
}

export function RoiSimulator() {
  const [acordos, setAcordos] = useState(100);
  const [ticket, setTicket] = useState(300);
  const [melhoria, setMelhoria] = useState(10);

  const resultadoAtual = acordos * ticket;
  const ganho = (acordos * (melhoria / 100)) * ticket;
  const novoResultado = resultadoAtual + ganho;
  const payback = ganho > 0 ? ganho / PLAN_PRICE : 0;

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-extrabold text-foreground leading-tight">
            Veja quanto o CobraMind pode gerar na sua operação
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            Pequenas melhorias na negociação podem gerar milhares de reais a mais por mês.
          </p>
        </div>

        {/* Simulator Card */}
        <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Inputs */}
          <div className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Acordos */}
              <div className="space-y-2">
                <Label htmlFor="acordos" className="text-sm font-medium text-foreground">
                  Quantidade de acordos por mês
                </Label>
                <Input
                  id="acordos"
                  type="number"
                  min={1}
                  value={acordos}
                  onChange={(e) => setAcordos(Math.max(1, Number(e.target.value) || 0))}
                  className="text-lg font-semibold"
                />
              </div>

              {/* Ticket */}
              <div className="space-y-2">
                <Label htmlFor="ticket" className="text-sm font-medium text-foreground">
                  Ticket médio por acordo (R$)
                </Label>
                <Input
                  id="ticket"
                  type="number"
                  min={1}
                  value={ticket}
                  onChange={(e) => setTicket(Math.max(1, Number(e.target.value) || 0))}
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            {/* Melhoria slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="melhoria" className="text-sm font-medium text-foreground">
                  Melhoria esperada com mais controle e treino
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="melhoria-input"
                    type="number"
                    min={1}
                    max={50}
                    value={melhoria}
                    onChange={(e) => setMelhoria(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-20 text-center text-base font-bold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">%</span>
                </div>
              </div>
              <Slider
                value={[melhoria]}
                onValueChange={(v) => setMelhoria(v[0])}
                min={1}
                max={50}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1%</span>
                <span>10%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimativa de ganho com melhoria na abordagem, análise e treinamento da equipe
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="border-t border-border bg-muted/30 p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {/* Resultado Atual */}
              <div className="rounded-lg border border-border bg-card p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Resultado atual estimado</p>
                </div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  R$ {fmt(resultadoAtual)}
                </p>
              </div>

              {/* Ganho — destaque */}
              <div className="rounded-lg border-2 border-success bg-success/5 p-5 text-center ring-2 ring-success/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <p className="text-sm font-semibold text-success">Ganho mensal com CobraMind</p>
                </div>
                <p className="text-3xl sm:text-4xl font-heading font-extrabold text-success">
                  R$ {fmt(ganho)}
                </p>
              </div>

              {/* Novo Resultado */}
              <div className="rounded-lg border border-border bg-card p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">Novo resultado estimado</p>
                </div>
                <p className="text-2xl font-heading font-bold text-primary">
                  R$ {fmt(novoResultado)}
                </p>
              </div>
            </div>

            {/* Payback */}
            {payback > 0 && (
              <div className="mt-6 text-center space-y-3">
                <p className="text-base sm:text-lg font-medium text-foreground">
                  Com esse cenário, o CobraMind pode se pagar{" "}
                  <span className="font-extrabold text-primary text-xl">{payback.toFixed(1)}x</span>{" "}
                  no mês.
                </p>
                <p className={cn(
                  "text-sm italic",
                  ganho < 1500 ? "text-muted-foreground" : ganho <= 6000 ? "text-success" : "text-primary"
                )}>
                  {getDynamicMessage(ganho)}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="mt-8 text-center">
              <a href={APP_URL}>
                <Button size="lg" className="text-base px-8 gap-2">
                  Quero aplicar isso na minha operação <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>

            {/* Disclaimer */}
            <p className="mt-6 text-xs text-muted-foreground text-center max-w-xl mx-auto">
              Simulação estimada com base em aumento de conversão. Os resultados podem variar conforme o volume, carteira, abordagem da equipe e disciplina operacional.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
