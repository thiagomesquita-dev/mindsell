-- Allow founder to insert training_sessions for any company
CREATE POLICY "Founder can insert training sessions"
  ON public.training_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);

-- Allow founder to insert ai_usage_logs for any company
CREATE POLICY "Founder can insert ai_usage_logs"
  ON public.ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);