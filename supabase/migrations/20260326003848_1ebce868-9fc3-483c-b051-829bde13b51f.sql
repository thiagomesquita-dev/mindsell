-- Allow founder to view ALL companies
CREATE POLICY "Founder can view all companies"
ON public.companies FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL analyses across companies
CREATE POLICY "Founder can view all analyses"
ON public.analyses FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL company_carteiras
CREATE POLICY "Founder can view all carteiras"
ON public.company_carteiras FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL operators
CREATE POLICY "Founder can view all operators"
ON public.operators FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL operator_cycles
CREATE POLICY "Founder can view all cycles"
ON public.operator_cycles FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL weekly_reports
CREATE POLICY "Founder can view all weekly reports"
ON public.weekly_reports FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL training_sessions
CREATE POLICY "Founder can view all training sessions"
ON public.training_sessions FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Allow founder to view ALL profiles
CREATE POLICY "Founder can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
