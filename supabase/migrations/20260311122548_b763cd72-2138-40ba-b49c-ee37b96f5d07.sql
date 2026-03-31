ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS modelo_usado text,
  ADD COLUMN IF NOT EXISTS tokens_prompt integer,
  ADD COLUMN IF NOT EXISTS tokens_resposta integer,
  ADD COLUMN IF NOT EXISTS tokens_total integer,
  ADD COLUMN IF NOT EXISTS custo_estimado numeric,
  ADD COLUMN IF NOT EXISTS tempo_resposta numeric,
  ADD COLUMN IF NOT EXISTS duracao_audio_total numeric;