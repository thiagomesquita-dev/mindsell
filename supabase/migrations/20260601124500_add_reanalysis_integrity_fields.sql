-- Keep AI model comparisons traceable without mixing them with operational analyses.
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS is_reanalysis boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_analysis_id uuid NULL REFERENCES public.analyses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_analyses_operational
  ON public.analyses (empresa_id, created_at DESC)
  WHERE is_reanalysis = false;

CREATE INDEX IF NOT EXISTS idx_analyses_source_analysis_id
  ON public.analyses (source_analysis_id)
  WHERE source_analysis_id IS NOT NULL;
