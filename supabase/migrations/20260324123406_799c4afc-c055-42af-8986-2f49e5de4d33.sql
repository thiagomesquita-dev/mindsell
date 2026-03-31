
CREATE TABLE public.analysis_reanalyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  mode text NOT NULL DEFAULT 'overwrite',
  tokens_prompt integer,
  tokens_resposta integer,
  custo_estimado numeric,
  tempo_resposta numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_reanalyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only founder can view reanalyses"
ON public.analysis_reanalyses FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only founder can insert reanalyses"
ON public.analysis_reanalyses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_reanalyses_analysis_id ON public.analysis_reanalyses(analysis_id);
