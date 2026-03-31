/**
 * Enriched tooltip content for bar charts.
 * Each chart type has a map of category → { description, impact, bestPractice }.
 * A fallback generator provides sensible defaults for unknown categories.
 */

export interface TooltipMeta {
  descricao: string;
  impacto: string;
  boaPratica: string;
}

// ── Objeções ──
const objectionMap: Record<string, TooltipMeta> = {
  "Sem dinheiro": {
    descricao: "Cliente informa que não possui recursos financeiros para quitar ou parcelar o débito no momento.",
    impacto: "", boaPratica: "",
  },
  "Não reconhece a dívida": {
    descricao: "Cliente afirma desconhecer a origem da cobrança ou contesta a validade do débito apresentado.",
    impacto: "", boaPratica: "",
  },
  "Vai pensar": {
    descricao: "Cliente não recusa a proposta, mas adia a decisão sem assumir compromisso de pagamento.",
    impacto: "", boaPratica: "",
  },
  "Já está pagando": {
    descricao: "Cliente informa que já possui um acordo ativo ou está quitando outra pendência financeira.",
    impacto: "", boaPratica: "",
  },
  "Desempregado": {
    descricao: "Cliente relata estar sem vínculo empregatício ou fonte de renda fixa no período atual.",
    impacto: "", boaPratica: "",
  },
  "Valor alto": {
    descricao: "Cliente considera o montante da dívida ou o valor das parcelas acima da sua capacidade de pagamento.",
    impacto: "", boaPratica: "",
  },
  "Promessa de retorno": {
    descricao: "Cliente encerra o contato prometendo ligar de volta ou retornar em outro momento para fechar acordo.",
    impacto: "", boaPratica: "",
  },
  "Problemas de saúde": {
    descricao: "Cliente relata condição de saúde própria ou de familiar como impedimento para negociar ou pagar.",
    impacto: "", boaPratica: "",
  },
  "Terceiro na linha": {
    descricao: "Quem atendeu a ligação não é o titular da dívida, impossibilitando a negociação direta.",
    impacto: "", boaPratica: "",
  },
  "Não quer negociar": {
    descricao: "Cliente se recusa a ouvir propostas ou dialogar sobre qualquer condição de pagamento.",
    impacto: "", boaPratica: "",
  },
  "Dúvida sobre dívida": {
    descricao: "Cliente questiona a origem ou validade da cobrança e pede esclarecimentos antes de considerar o pagamento.",
    impacto: "", boaPratica: "",
  },
};

// ── Erros Operacionais ──
const errorMap: Record<string, TooltipMeta> = {
  "Falta de ancoragem": {
    descricao: "Operador apresentou o desconto sem mostrar antes o valor original, reduzindo a percepção de ganho pelo cliente.",
    impacto: "", boaPratica: "",
  },
  "Sem confirmação de dados": {
    descricao: "Operador iniciou a negociação sem validar a identidade do titular, gerando risco de conformidade.",
    impacto: "", boaPratica: "",
  },
  "Fechamento fraco": {
    descricao: "Operador encerrou o contato sem conduzir o cliente a um compromisso claro de valor, data e forma de pagamento.",
    impacto: "", boaPratica: "",
  },
  "Falta de empatia": {
    descricao: "Operador não demonstrou compreensão pela situação do cliente, gerando resistência na negociação.",
    impacto: "", boaPratica: "",
  },
  "Insistência excessiva": {
    descricao: "Operador repetiu a mesma condição várias vezes sem adaptar a proposta à objeção do cliente.",
    impacto: "", boaPratica: "",
  },
  "Sem escolha guiada": {
    descricao: "Operador não ofereceu opções estruturadas, deixando o cliente sem direção para tomar uma decisão.",
    impacto: "", boaPratica: "",
  },
  "Abertura inadequada": {
    descricao: "Operador iniciou o atendimento sem se identificar adequadamente ou sem contextualizar o motivo do contato.",
    impacto: "", boaPratica: "",
  },
  "Sem personalização": {
    descricao: "Operador seguiu um roteiro genérico sem adaptar a abordagem ao perfil e situação do cliente.",
    impacto: "", boaPratica: "",
  },
  "Tom inadequado": {
    descricao: "Operador adotou postura agressiva, irônica ou desinteressada durante a negociação.",
    impacto: "", boaPratica: "",
  },
  "Não tratou objeção": {
    descricao: "Operador ignorou a resistência do cliente e continuou o script sem investigar ou reformular a proposta.",
    impacto: "", boaPratica: "",
  },
};

// ── Técnicas de Negociação ──
const techniqueMap: Record<string, TooltipMeta> = {
  "Ancoragem": {
    descricao: "Operador apresentou o valor total da dívida antes do desconto, destacando a economia para o cliente.",
    impacto: "", boaPratica: "",
  },
  "Escolha Guiada": {
    descricao: "Operador ofereceu alternativas estruturadas para facilitar a decisão do cliente entre condições de pagamento.",
    impacto: "", boaPratica: "",
  },
  "Fechamento Assumido": {
    descricao: "Operador conduziu o encerramento confirmando dados de pagamento como se o acordo já estivesse definido.",
    impacto: "", boaPratica: "",
  },
  "Empatia": {
    descricao: "Operador demonstrou compreensão e acolhimento com a situação financeira ou pessoal do cliente.",
    impacto: "", boaPratica: "",
  },
  "Personalização": {
    descricao: "Operador adaptou a proposta e a linguagem à realidade específica do cliente durante a negociação.",
    impacto: "", boaPratica: "",
  },
  "Senso de Urgência": {
    descricao: "Operador informou prazo ou condição limitada da oferta para incentivar a decisão imediata do cliente.",
    impacto: "", boaPratica: "",
  },
  "Investigação": {
    descricao: "Operador fez perguntas para entender a capacidade de pagamento e as prioridades do cliente.",
    impacto: "", boaPratica: "",
  },
  "Rapport": {
    descricao: "Operador construiu conexão pessoal com o cliente, gerando confiança e abertura para a negociação.",
    impacto: "", boaPratica: "",
  },
  "Reformulação": {
    descricao: "Operador ajustou a proposta após receber objeção, apresentando nova condição ao cliente.",
    impacto: "", boaPratica: "",
  },
  "Script Padrão": {
    descricao: "Operador seguiu o roteiro institucional sem adaptações significativas ao contexto da negociação.",
    impacto: "", boaPratica: "",
  },
};

type ChartType = "objection" | "error" | "technique";

const maps: Record<ChartType, Record<string, TooltipMeta>> = {
  objection: objectionMap,
  error: errorMap,
  technique: techniqueMap,
};

const fallbacks: Record<ChartType, (name: string) => TooltipMeta> = {
  objection: () => ({
    descricao: "Cliente apresentou resistência ao pagamento durante a negociação.",
    impacto: "", boaPratica: "",
  }),
  error: () => ({
    descricao: "Falha identificada na condução da negociação pelo operador.",
    impacto: "", boaPratica: "",
  }),
  technique: () => ({
    descricao: "Estratégia utilizada pelo operador para conduzir a negociação.",
    impacto: "", boaPratica: "",
  }),
};

/**
 * Find the best matching tooltip metadata for a category name.
 * Uses exact match first, then partial/fuzzy match.
 */
export function getTooltipMeta(chartType: ChartType, categoryName: string): TooltipMeta {
  const map = maps[chartType];

  // Exact match
  if (map[categoryName]) return map[categoryName];

  // Partial match: check if any key is contained in the name or vice-versa
  const lowerName = categoryName.toLowerCase();
  for (const [key, meta] of Object.entries(map)) {
    const lowerKey = key.toLowerCase();
    if (lowerName.includes(lowerKey) || lowerKey.includes(lowerName)) {
      return meta;
    }
  }

  // Fallback
  return fallbacks[chartType](categoryName);
}

export type { ChartType };
