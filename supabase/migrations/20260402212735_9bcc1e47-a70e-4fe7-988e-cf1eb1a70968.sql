
-- Enum for action types
CREATE TYPE public.ai_action_type AS ENUM (
  'analysis',
  'training_generation',
  'training_evaluation',
  'radar_diagnostic'
);

-- Main config table
CREATE TABLE public.ai_model_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type ai_action_type NOT NULL UNIQUE,
  provider text NOT NULL,
  model text NOT NULL,
  fallback_provider text,
  fallback_model text,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_model_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder can select ai_model_config"
  ON public.ai_model_config FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can insert ai_model_config"
  ON public.ai_model_config FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can update ai_model_config"
  ON public.ai_model_config FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br')
  WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can delete ai_model_config"
  ON public.ai_model_config FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Service role can read (for edge functions)
CREATE POLICY "Service role can read ai_model_config"
  ON public.ai_model_config FOR SELECT TO service_role
  USING (true);

-- History table
CREATE TABLE public.ai_model_config_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.ai_model_config(id) ON DELETE CASCADE,
  action_type ai_action_type NOT NULL,
  previous_provider text,
  previous_model text,
  new_provider text NOT NULL,
  new_model text NOT NULL,
  previous_fallback_provider text,
  previous_fallback_model text,
  new_fallback_provider text,
  new_fallback_model text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_model_config_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder can view config history"
  ON public.ai_model_config_history FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "System can insert config history"
  ON public.ai_model_config_history FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service role can insert config history"
  ON public.ai_model_config_history FOR INSERT TO service_role
  WITH CHECK (true);

-- Trigger to auto-log changes
CREATE OR REPLACE FUNCTION public.log_ai_model_config_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.ai_model_config_history (
      config_id, action_type,
      previous_provider, previous_model,
      new_provider, new_model,
      previous_fallback_provider, previous_fallback_model,
      new_fallback_provider, new_fallback_model,
      changed_by
    ) VALUES (
      NEW.id, NEW.action_type,
      OLD.provider, OLD.model,
      NEW.provider, NEW.model,
      OLD.fallback_provider, OLD.fallback_model,
      NEW.fallback_provider, NEW.fallback_model,
      NEW.updated_by
    );
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_model_config_change
  BEFORE UPDATE ON public.ai_model_config
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ai_model_config_change();

-- Seed default configs
INSERT INTO public.ai_model_config (action_type, provider, model, fallback_provider, fallback_model) VALUES
  ('analysis', 'google', 'gemini-3.1-pro-preview', 'openai', 'gpt-4.1'),
  ('training_generation', 'openai', 'gpt-5.4', NULL, NULL),
  ('training_evaluation', 'openai', 'gpt-5.4', NULL, NULL),
  ('radar_diagnostic', 'openai', 'gpt-5.4', NULL, NULL);
