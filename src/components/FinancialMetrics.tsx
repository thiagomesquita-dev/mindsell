import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/KpiCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { DollarSign, CreditCard, Receipt, TrendingUp, Info } from "lucide-react";

interface CarteiraFinancial {
  comissao_recebida_periodo: number | null;
  quantidade_pagamentos_periodo: number | null;
  periodo_referencia: string | null;
}

interface FinancialMetricsProps {
  carteira: CarteiraFinancial | null;
  avgScore: number;
}

function estimateImpact(improvementPoints: number, ticketMedio: number, qtdPagamentos: number) {
  const minPctIncrease = improvementPoints * 4;
  const maxPctIncrease = improvementPoints * 8;

  const minExtraPayments = Math.round(qtdPagamentos * (minPctIncrease / 100));
  const maxExtraPayments = Math.round(qtdPagamentos * (maxPctIncrease / 100));

  const minImpact = minExtraPayments * ticketMedio;
  const maxImpact = maxExtraPayments * ticketMedio;

  return { minExtraPayments, maxExtraPayments, minImpact, maxImpact, minPctIncrease, maxPctIncrease };
}

export function FinancialMetrics({ carteira, avgScore }: FinancialMetricsProps) {
  const [improvement, setImprovement] = useState(0.5);

  if (!carteira || !carteira.comissao_recebida_periodo || !carteira.quantidade_pagamentos_periodo) {
    return null;
  }

  const comissao = carteira.comissao_recebida_periodo;
  const qtdPagamentos = carteira.quantidade_pagamentos_periodo;
  const ticketMedio = comissao / qtdPagamentos;
  const periodo = carteira.periodo_referencia || "—";

  const impact = avgScore > 0 && improvement > 0
    ? estimateImpact(improvement, ticketMedio, qtdPagamentos)
    : null;

  return (
    <>
      <section className="mb-10">
        <h2 className="font-heading text-base font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Métricas Financeiras da Carteira
        </h2>
        <p className="text-sm text-muted-foreground font-body mb-4">
          Período de referência: {periodo}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard
            title="Comissão Recebida"
            value={`R$ ${comissao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KpiCard
            title="Qtd. de Pagamentos"
            value={qtdPagamentos.toLocaleString("pt-BR")}
            icon={<CreditCard className="h-5 w-5" />}
          />
          <KpiCard
            title="Ticket Médio"
            value={`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<Receipt className="h-5 w-5" />}
            tooltip="Calculado automaticamente: Comissão recebida ÷ Quantidade de pagamentos"
          />
        </div>
      </section>

      {avgScore > 0 && (
        <section className="mb-10">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Simulador de Impacto Operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Melhoria simulada: <span className="text-primary font-bold">+{improvement.toFixed(1)} ponto{improvement !== 1 ? "s" : ""}</span> na qualidade média
                  <span className="text-muted-foreground ml-1">(atual: {avgScore.toFixed(1)})</span>
                </p>
                <Slider
                  value={[improvement]}
                  onValueChange={(v) => setImprovement(v[0])}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                  <span>1.5</span>
                  <span>2.0</span>
                </div>
              </div>

              {impact ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-card border border-border p-4">
                    <p className="text-sm text-muted-foreground mb-1">Pagamentos adicionais estimados</p>
                    <p className="text-2xl font-heading font-bold text-foreground">
                      +{impact.minExtraPayments} a +{impact.maxExtraPayments}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      (+{impact.minPctIncrease.toFixed(1)}% a +{impact.maxPctIncrease.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="rounded-lg bg-card border border-border p-4">
                    <p className="text-sm text-muted-foreground mb-1">Impacto estimado em receita</p>
                    <p className="text-2xl font-heading font-bold text-primary">
                      R$ {impact.minImpact.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} a R$ {impact.maxImpact.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Mova o slider para simular o impacto.</p>
              )}

              <Alert className="bg-secondary border-border">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Estimativa baseada em melhoria de qualidade das negociações. Os valores reais podem variar conforme o perfil da carteira e condições de mercado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
}