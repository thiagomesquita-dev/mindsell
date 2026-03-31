
CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id),
  operador TEXT NOT NULL,
  semana_numero INTEGER NOT NULL DEFAULT 1,
  data_inicio_semana TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim_semana TIMESTAMP WITH TIME ZONE NOT NULL,
  numero_negociacoes INTEGER NOT NULL DEFAULT 0,
  score_medio NUMERIC,
  chance_pagamento_media NUMERIC,
  risco_quebra_medio NUMERIC,
  principais_erros TEXT[],
  principais_objecoes TEXT[],
  padrao_tom TEXT,
  pontos_fortes_recorrentes TEXT[],
  pontos_de_melhoria TEXT[],
  avaliacao_geral TEXT,
  plano_desenvolvimento TEXT,
  comparacao_com_semana_anterior JSONB,
  classificacao_evolucao TEXT,
  analysis_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  status TEXT NOT NULL DEFAULT 'fechado',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, operador, data_inicio_semana)
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company weekly reports"
  ON public.weekly_reports
  FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Service can insert weekly reports"
  ON public.weekly_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Service can update weekly reports"
  ON public.weekly_reports
  FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
