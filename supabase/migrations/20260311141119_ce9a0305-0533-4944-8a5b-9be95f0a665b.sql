ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS feedback_diagnostico text,
  ADD COLUMN IF NOT EXISTS feedback_orientacao text,
  ADD COLUMN IF NOT EXISTS feedback_exercicio text,
  ADD COLUMN IF NOT EXISTS feedback_exemplo text;