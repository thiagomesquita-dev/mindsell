import { useMemo } from "react";
import { Brain } from "lucide-react";

interface Analysis {
  score: number | null;
  chance_pagamento: number | null;
  risco_quebra: number | null;
  categoria_objecao: string | null;
  categoria_erro: string | null;
  tecnica_usada: string | null;
}

function topItem(items: (string | null)[]): string | null {
  const counts: Record<string, number> = {};
  items.forEach((i) => { if (i) counts[i] = (counts[i] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

function extractShort(text: string): string {
  return text.split(/\s*[—–-]\s/)[0].trim();
}

export function DiagnosticoIA({ analyses }: { analyses: Analysis[] }) {
  const diagnostico = useMemo(() => {
    if (analyses.length === 0) return null;

    const avgScore = analyses.reduce((s, a) => s + (Number(a.score) || 0), 0) / analyses.length;
    const avgPayment = analyses.reduce((s, a) => s + (Number(a.chance_pagamento) || 0), 0) / analyses.length;
    const avgRisk = analyses.reduce((s, a) => s + (Number(a.risco_quebra) || 0), 0) / analyses.length;

    const topTechnique = topItem(analyses.map((a) => a.tecnica_usada));
    const topError = topItem(analyses.map((a) => a.categoria_erro));
    const topObjection = topItem(analyses.map((a) => a.categoria_objecao));

    const insights: string[] = [];

    if (topTechnique) {
      insights.push(`O padrão dominante de negociação da equipe é "${extractShort(topTechnique)}". Isso indica que a maioria dos operadores está adotando essa abordagem como principal estratégia de condução.`);
    }

    if (topError) {
      const errorPct = analyses.filter((a) => a.categoria_erro === topError).length / analyses.length * 100;
      insights.push(`A falha mais recorrente é "${topError}", presente em ${Math.round(errorPct)}% das negociações analisadas. Recomenda-se ação corretiva direcionada a esse ponto.`);
    }

    if (topObjection) {
      insights.push(`A principal barreira enfrentada pelos operadores é "${topObjection}". Treinamentos focados em contornar essa objeção podem melhorar significativamente os resultados.`);
    }

    if (avgPayment < 50) {
      insights.push(`A chance média de pagamento está em ${Math.round(avgPayment)}%, abaixo do ideal. Isso sugere que as negociações não estão gerando compromissos firmes dos clientes.`);
    } else if (avgPayment >= 70) {
      insights.push(`A chance média de pagamento está em ${Math.round(avgPayment)}%, um indicador positivo de efetividade nas negociações.`);
    }

    if (avgRisk > 40) {
      insights.push(`O risco médio de quebra de acordo está em ${Math.round(avgRisk)}%. Considere reforçar técnicas de fechamento com comprometimento mais claro do cliente.`);
    }

    if (avgScore < 5) {
      insights.push(`A qualidade média das negociações está em ${avgScore.toFixed(1)}, indicando oportunidade significativa de melhoria na postura e técnica dos operadores.`);
    }

    return { insights, avgScore, avgPayment, avgRisk };
  }, [analyses]);

  if (!diagnostico || diagnostico.insights.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-muted-foreground text-sm">Dados insuficientes para gerar o diagnóstico.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Resumo gerado com base em {analyses.length} negociações analisadas
        </p>
      </div>
      <ul className="space-y-4">
        {diagnostico.insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-xs font-heading font-bold text-muted-foreground mt-0.5 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-sm text-foreground/90 font-body leading-relaxed">{insight}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
