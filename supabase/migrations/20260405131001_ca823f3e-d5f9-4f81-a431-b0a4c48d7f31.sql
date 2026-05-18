
-- Founder can insert portfolios for any company
CREATE POLICY "Founder can insert portfolios"
ON public.user_portfolios
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
);

-- Founder can delete portfolios for any company
CREATE POLICY "Founder can delete portfolios"
ON public.user_portfolios
FOR DELETE
TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
);

-- Founder can view all portfolios
CREATE POLICY "Founder can view all portfolios"
ON public.user_portfolios
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
);
