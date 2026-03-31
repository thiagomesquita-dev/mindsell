
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  analysis_id uuid,
  training_id uuid,
  action_type text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  audio_seconds numeric DEFAULT 0,
  estimated_cost_usd numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder can view all ai_usage_logs"
  ON public.ai_usage_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);

CREATE POLICY "Service role can insert ai_usage_logs"
  ON public.ai_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_ai_usage_logs_empresa ON public.ai_usage_logs(empresa_id);
CREATE INDEX idx_ai_usage_logs_action ON public.ai_usage_logs(action_type);
CREATE INDEX idx_ai_usage_logs_created ON public.ai_usage_logs(created_at);
