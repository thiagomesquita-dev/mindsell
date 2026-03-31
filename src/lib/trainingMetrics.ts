/** Grade band interpretation for nota_final */
export function getGradeBand(nota: number | null | undefined): { label: string; color: string } {
  if (nota == null) return { label: "—", color: "text-muted-foreground" };
  if (nota >= 9) return { label: "Excelente", color: "text-success" };
  if (nota >= 7) return { label: "Bom", color: "text-primary" };
  if (nota >= 5) return { label: "Regular", color: "text-warning" };
  return { label: "Crítico", color: "text-destructive" };
}

export const TRAINING_TOOLTIPS = {
  nota_final:
    "A Nota Final avalia a qualidade geral da resposta do operador com base em:\n• Aderência ao objetivo do treino\n• Clareza da comunicação\n• Condução da negociação\n• Consistência com o cenário apresentado",
  entendimento:
    "Mede se o operador compreendeu corretamente a situação do cliente e identificou a necessidade principal da negociação.",
  coerencia:
    "Avalia se a resposta do operador mantém lógica, consistência e alinhamento com o contexto apresentado.",
  nivel_aprendizado:
    "Indica o quanto o operador demonstrou aprendizado real a partir do cenário, considerando interpretação, decisão, resposta e reflexão.",
  qualidade_resposta:
    "Avalia a qualidade prática da resposta do operador, incluindo clareza, objetividade e aplicabilidade.",
} as const;
