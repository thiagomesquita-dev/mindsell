ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS transcription_source text NOT NULL DEFAULT 'modelo',
  ADD COLUMN IF NOT EXISTS transcription_quality text NOT NULL DEFAULT 'ok';