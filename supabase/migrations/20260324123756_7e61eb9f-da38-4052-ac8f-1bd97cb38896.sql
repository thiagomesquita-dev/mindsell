
DROP POLICY IF EXISTS "Only founder can view reanalyses" ON public.analysis_reanalyses;
DROP POLICY IF EXISTS "Only founder can insert reanalyses" ON public.analysis_reanalyses;

CREATE POLICY "Founder can view reanalyses"
ON public.analysis_reanalyses FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can insert reanalyses"
ON public.analysis_reanalyses FOR INSERT
TO authenticated
WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br' AND user_id = auth.uid());

CREATE POLICY "Founder can update reanalyses"
ON public.analysis_reanalyses FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br')
WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can delete reanalyses"
ON public.analysis_reanalyses FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
