-- Allow founder (by email) to update any training_sessions row across companies
CREATE POLICY "Founder can update training sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text)
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);