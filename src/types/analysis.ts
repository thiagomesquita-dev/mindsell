/**
 * Interface para o resultado da análise de IA do CobraMind.
 * Representa a estrutura retornada pelo motor de análise (Edge Function).
 */
export interface AidaEvaluation {
  nota?: number;
  comentario?: string;
}

export interface AnalysisResult {
  resumo: string;
  pontos_fortes: string[];
  pontos_melhorar: string[];
  sugestoes: string[];
  aida_atencao: AidaEvaluation;
  aida_interesse: AidaEvaluation;
  aida_desejo: AidaEvaluation;
  aida_objecao: AidaEvaluation;
  aida_acao: AidaEvaluation;
  categoria_objecao?: string;
  categoria_erro?: string;
  objecao?: string;
  tom_operador: string;
  risco_quebra: number;
  chance_pagamento: number;
  erro_principal: string;
  mensagem_ideal: string;
  nota_qa: number;
  nivel_habilidade: string;
  conformidade: string;
  justificativa_conformidade: string;
  score: number;
  tecnica_usada?: string;
  feedback_diagnostico?: string;
  feedback_orientacao?: string;
  feedback_exercicio?: string;
  feedback_exemplo?: string;
}

/**
 * Tipo completo de uma análise salva no banco (linha da tabela analyses).
 * Re-exporta o tipo gerado pelo Supabase para uso centralizado.
 */
export type { Tables } from "@/integrations/supabase/types";

import type { Tables } from "@/integrations/supabase/types";
export type AnalysisRow = Tables<"analyses">;
export type OperatorCycleRow = Tables<"operator_cycles">;
