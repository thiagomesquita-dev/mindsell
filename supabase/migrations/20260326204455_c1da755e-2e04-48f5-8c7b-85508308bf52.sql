
DROP POLICY "Service role can insert ai_usage_logs" ON public.ai_usage_logs;

CREATE POLICY "Authenticated can insert ai_usage_logs"
  ON public.ai_usage_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
