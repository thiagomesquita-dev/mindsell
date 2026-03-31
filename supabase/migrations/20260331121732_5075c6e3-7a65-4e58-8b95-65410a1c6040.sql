
-- Migrate existing data: manual -> pontual, automatico -> pontual (since auto was also analysis-based)
UPDATE public.training_sessions SET origem = 'pontual' WHERE origem = 'manual';
UPDATE public.training_sessions SET origem = 'pontual' WHERE origem = 'automatico';
