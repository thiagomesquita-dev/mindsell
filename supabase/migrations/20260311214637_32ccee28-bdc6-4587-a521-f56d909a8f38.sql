
-- Create operator_cycles table
CREATE TABLE public.operator_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id),
  operador text NOT NULL,
  ciclo_numero integer NOT NULL DEFAULT 1,
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz,
  numero_negociacoes integer NOT NULL DEFAULT 0,
  score_medio numeric,
  chance_media_pagamento numeric,
  risco_medio_quebra numeric,
  principais_erros text[],
  principais_objecoes text[],
  padrao_tom text,
  avaliacao_geral text,
  pontos_fortes_recorrentes text[],
  pontos_de_melhoria text[],
  plano_desenvolvimento text,
  comparacao_com_ciclo_anterior jsonb,
  avaliacao_evolucao text,
  analysis_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.operator_cycles ENABLE ROW LEVEL SECURITY;

-- RLS policies: scoped to company
CREATE POLICY "Users can view company cycles"
ON public.operator_cycles FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Service can insert cycles"
ON public.operator_cycles FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Service can update cycles"
ON public.operator_cycles FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));
