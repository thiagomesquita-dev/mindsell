-- Allow founder to insert and update companies
CREATE POLICY "Founder can insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);

CREATE POLICY "Founder can update companies"
ON public.companies FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text)
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'thiago@thiagoanalytics.com.br'::text);

-- Allow coordinators to update memberships for their own company
CREATE POLICY "Coordinators can update memberships for own company"
ON public.company_memberships FOR UPDATE TO authenticated
USING (company_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()))
WITH CHECK (company_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()));

-- Allow coordinators to delete memberships for own company
CREATE POLICY "Coordinators can delete memberships for own company"
ON public.company_memberships FOR DELETE TO authenticated
USING (company_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()));

-- Allow users to view companies they belong to via membership
CREATE POLICY "Users can view membership companies"
ON public.companies FOR SELECT TO authenticated
USING (id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid() AND is_active = true));