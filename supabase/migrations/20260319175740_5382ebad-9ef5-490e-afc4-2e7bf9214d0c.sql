ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS resposta_interpretacao text,
  ADD COLUMN IF NOT EXISTS resposta_decisao text,
  ADD COLUMN IF NOT EXISTS acerto_interpretacao boolean,
  ADD COLUMN IF NOT EXISTS acerto_decisao boolean,
  ADD COLUMN IF NOT EXISTS nivel_aprendizado text;