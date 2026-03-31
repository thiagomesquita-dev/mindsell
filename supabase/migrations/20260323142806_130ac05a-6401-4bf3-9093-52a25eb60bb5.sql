
-- ENUM origem
DO $$ BEGIN
    CREATE TYPE training_origem AS ENUM ('manual', 'automatico');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Coluna origem
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS origem training_origem NOT NULL DEFAULT 'manual';

-- IDs das análises que geraram treino automático
ALTER TABLE public.training_sessions 
ADD COLUMN IF NOT EXISTS auto_analysis_ids uuid[] DEFAULT '{}'::uuid[];

-- Hash para evitar duplicidade
ALTER TABLE public.training_sessions
ADD COLUMN IF NOT EXISTS auto_analysis_hash text;

-- Índices
CREATE INDEX IF NOT EXISTS idx_training_sessions_origem
ON public.training_sessions (origem);

CREATE INDEX IF NOT EXISTS idx_training_sessions_auto_hash
ON public.training_sessions (auto_analysis_hash);
