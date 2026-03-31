export interface MetricExplanation {
  tooltip: string;
  title: string;
  description: string;
  weights: { label: string; weight: string }[];
}

export const metricExplanations: Record<string, MetricExplanation> = {
  chancePagamento: {
    tooltip:
      "Probabilidade média de pagamento com base em:\n• Intenção demonstrada pelo cliente\n• Capacidade percebida de pagamento\n• Clareza e firmeza no fechamento",
    title: "Como calculamos a Chance de Pagamento",
    description:
      "A IA analisa sinais na conversa que indicam intenção real de pagamento, capacidade financeira percebida e o quão claro foi o acordo final.",
    weights: [
      { label: "Intenção do cliente", weight: "40%" },
      { label: "Capacidade de pagamento", weight: "35%" },
      { label: "Clareza do compromisso", weight: "25%" },
    ],
  },
  riscoQuebra: {
    tooltip:
      "Probabilidade de não cumprimento do acordo com base em:\n• Sinais de insegurança do cliente\n• Falta de clareza no fechamento\n• Inconsistências na negociação\n• Objeções não totalmente resolvidas",
    title: "Como calculamos o Risco de Quebra",
    description:
      "Mesmo após o acordo, a IA identifica sinais de risco com base na qualidade do fechamento e na segurança demonstrada pelo cliente.",
    weights: [
      { label: "Insegurança do cliente", weight: "30%" },
      { label: "Falta de clareza no fechamento", weight: "30%" },
      { label: "Inconsistência na negociação", weight: "20%" },
      { label: "Objeções não resolvidas", weight: "20%" },
    ],
  },
  qualidadeMedia: {
    tooltip:
      "Qualidade geral das negociações com base na metodologia AIDA:\n• Atenção (abertura e conexão)\n• Interesse (clareza da explicação)\n• Desejo (tratamento de objeções)\n• Ação (fechamento e compromisso)",
    title: "Como calculamos a Qualidade Média",
    description:
      "A qualidade é calculada pela média ponderada das quatro etapas da metodologia AIDA, avaliando a condução completa da negociação.",
    weights: [
      { label: "Atenção (abertura e conexão)", weight: "25%" },
      { label: "Interesse (clareza da proposta)", weight: "25%" },
      { label: "Desejo (tratamento de objeções)", weight: "25%" },
      { label: "Ação (fechamento e compromisso)", weight: "25%" },
    ],
  },
  score: {
    tooltip:
      "Pontuação consolidada da supervisão considerando:\n• Volume de análises realizadas\n• Qualidade média das negociações\n• Consistência dos resultados",
    title: "Como calculamos o Score",
    description:
      "O score combina qualidade e volume para refletir o impacto real do supervisor na operação. Score = (Qualidade Média × 10 × Fator de Volume) + (Qtd Análises × 2).",
    weights: [
      { label: "Qualidade média × 10", weight: "base" },
      { label: "Fator de volume (min 1, Qtd/10)", weight: "×" },
      { label: "Quantidade de análises × 2", weight: "+" },
    ],
  },
  confiabilidade: {
    tooltip:
      "Nível de confiança dos dados baseado na quantidade de análises:\n• Alta: volume consistente\n• Média: volume moderado\n• Baixa: pouca amostragem",
    title: "Como definimos a Confiabilidade",
    description:
      "A confiabilidade indica o grau de certeza dos indicadores. Quanto maior o volume de análises, mais confiáveis são os números apresentados.",
    weights: [
      { label: "Alta (10+ análises)", weight: "🟢" },
      { label: "Média (5–9 análises)", weight: "🟡" },
      { label: "Baixa (< 5 análises)", weight: "🔴" },
    ],
  },
};
