ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS supervisor_reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_feedback_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supervisor_feedback_note text,
  ADD COLUMN IF NOT EXISTS supervisor_feedback_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS supervisor_feedback_by uuid;