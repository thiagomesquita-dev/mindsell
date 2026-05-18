
-- Restrict company_subscriptions SELECT to coordinators only
DROP POLICY IF EXISTS "Users can view own company subscription" ON public.company_subscriptions;

CREATE POLICY "Coordinators can view company subscription"
  ON public.company_subscriptions FOR SELECT TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );
