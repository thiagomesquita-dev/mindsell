/**
 * Modelo de cálculo da Chance de Pagamento — CobraMind
 *
 * A chance de pagamento é calculada a partir de 3 dimensões:
 *
 * 1. **Intenção do cliente** (peso 0.40)
 *    Reflete a vontade real do cliente de resolver a dívida:
 *    reconhecimento, interesse em negociar, engajamento, abertura a propostas.
 *
 * 2. **Capacidade percebida** (peso 0.35)
 *    Reflete compatibilidade da proposta com a realidade financeira do cliente:
 *    adequação do valor/parcelamento, conforto com datas, ausência de fragilidade.
 *
 * 3. **Firmeza do compromisso** (peso 0.25)
 *    Reflete a clareza e consistência do fechamento:
 *    data/valor confirmados, compromisso verbal, ausência de hesitação.
 *
 * Fórmula:
 *   chance_pagamento = 0.40 * intencao + 0.35 * capacidade + 0.25 * firmeza
 *
 * Todos os valores são normalizados entre 0 e 100.
 */

// ─── Pesos ───

export const PAYMENT_WEIGHTS = {
  intencao: 0.40,
  capacidade: 0.35,
  firmeza: 0.25,
} as const;

export const RISK_WEIGHTS = {
  fragilidade_financeira: 0.35,
  hesitacao_cliente: 0.25,
  objecao_mal_resolvida: 0.20,
  fechamento_fraco: 0.20,
} as const;

// ─── Helpers ───

/** Clamp a value between 0 and 100 */
export function clamp0100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Calcula a chance de pagamento com base nos 3 subindicadores.
 * Se algum subindicador for null/undefined, usa fallback (50 = neutro).
 */
export function calcChancePagamento(
  intencao: number | null | undefined,
  capacidade: number | null | undefined,
  firmeza: number | null | undefined,
): number {
  const i = intencao ?? 50;
  const c = capacidade ?? 50;
  const f = firmeza ?? 50;

  return clamp0100(
    PAYMENT_WEIGHTS.intencao * i +
    PAYMENT_WEIGHTS.capacidade * c +
    PAYMENT_WEIGHTS.firmeza * f
  );
}

/**
 * Calcula a solidez do acordo.
 * solidez = chance_pagamento * (1 - risco_quebra)
 * Ambos em escala 0-100 na entrada; saída também 0-100.
 */
export function calcSolidezAcordo(
  chancePagamento: number,
  riscoQuebra: number,
): number {
  const cp = clamp0100(chancePagamento) / 100;
  const rq = clamp0100(riscoQuebra) / 100;
  return clamp0100((cp * (1 - rq)) * 100);
}

// ─── Aggregation helpers (Dashboard) ───

export interface PaymentSubIndicators {
  intencao: number;
  capacidade: number;
  firmeza: number;
}

/**
 * Calcula as médias dos subindicadores a partir de um array de análises.
 * Retorna null se nenhuma análise tiver dados dos subindicadores.
 */
export function aggregatePaymentSubIndicators(
  analyses: Array<{
    intencao_cliente?: number | null;
    capacidade_percebida?: number | null;
    firmeza_compromisso?: number | null;
  }>,
): PaymentSubIndicators | null {
  const withData = analyses.filter(
    (a) =>
      a.intencao_cliente != null ||
      a.capacidade_percebida != null ||
      a.firmeza_compromisso != null,
  );

  if (withData.length === 0) return null;

  const sum = { intencao: 0, capacidade: 0, firmeza: 0 };
  const count = { intencao: 0, capacidade: 0, firmeza: 0 };

  for (const a of withData) {
    if (a.intencao_cliente != null) {
      sum.intencao += Number(a.intencao_cliente);
      count.intencao++;
    }
    if (a.capacidade_percebida != null) {
      sum.capacidade += Number(a.capacidade_percebida);
      count.capacidade++;
    }
    if (a.firmeza_compromisso != null) {
      sum.firmeza += Number(a.firmeza_compromisso);
      count.firmeza++;
    }
  }

  return {
    intencao: count.intencao > 0 ? clamp0100(sum.intencao / count.intencao) : 50,
    capacidade: count.capacidade > 0 ? clamp0100(sum.capacidade / count.capacidade) : 50,
    firmeza: count.firmeza > 0 ? clamp0100(sum.firmeza / count.firmeza) : 50,
  };
}
