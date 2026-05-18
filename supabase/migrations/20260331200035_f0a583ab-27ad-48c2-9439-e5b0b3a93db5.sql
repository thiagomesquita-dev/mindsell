DROP POLICY IF EXISTS "Founder can insert carteiras" ON public.company_carteiras;
DROP POLICY IF EXISTS "Founder can update carteiras" ON public.company_carteiras;

CREATE POLICY "Founder can insert carteiras"
ON public.company_carteiras
FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);

CREATE POLICY "Founder can update carteiras"
ON public.company_carteiras
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text)
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);