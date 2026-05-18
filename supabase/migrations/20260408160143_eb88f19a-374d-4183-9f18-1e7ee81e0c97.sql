
-- Drop existing service_role policies that use {public} role (too broad)
DROP POLICY IF EXISTS "service role insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "service role update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "service role delete user_roles" ON public.user_roles;

-- Re-create service role policies scoped to service_role only
CREATE POLICY "service_role can insert user_roles"
  ON public.user_roles FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "service_role can update user_roles"
  ON public.user_roles FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role can delete user_roles"
  ON public.user_roles FOR DELETE TO service_role
  USING (true);

-- Explicit authenticated INSERT policy: only founder or coordinators
CREATE POLICY "Only founder or coordinators can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
    OR is_coordinator(auth.uid())
  );

-- Explicit authenticated UPDATE policy: only founder or coordinators
CREATE POLICY "Only founder or coordinators can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
    OR is_coordinator(auth.uid())
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
    OR is_coordinator(auth.uid())
  );

-- Explicit authenticated DELETE policy: only founder or coordinators
CREATE POLICY "Only founder or coordinators can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
    OR is_coordinator(auth.uid())
  );
