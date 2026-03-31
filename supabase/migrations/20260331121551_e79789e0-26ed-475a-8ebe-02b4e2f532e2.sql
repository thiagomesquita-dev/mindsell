
-- Add new enum values to training_origem
ALTER TYPE public.training_origem ADD VALUE IF NOT EXISTS 'pontual';
ALTER TYPE public.training_origem ADD VALUE IF NOT EXISTS 'completo';
