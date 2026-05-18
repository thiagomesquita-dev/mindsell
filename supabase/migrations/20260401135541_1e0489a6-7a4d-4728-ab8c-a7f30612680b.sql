
DROP POLICY IF EXISTS "Service role can insert exchange rates" ON public.exchange_rates;

CREATE POLICY "Founder can insert exchange rates"
  ON public.exchange_rates FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);
