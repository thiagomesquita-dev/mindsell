-- Hardening phase 2: user_roles + training_sessions RLS alignment

-- 1) user_roles: lock write operations for authenticated users
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- remove any write policies for authenticated
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='user_roles'
      AND cmd IN ('INSERT','UPDATE','DELETE')
      AND 'authenticated' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', p.policyname);
  END LOOP;
END $$;

-- explicit deny for authenticated
DROP POLICY IF EXISTS "authenticated deny insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "authenticated deny update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "authenticated deny delete user_roles" ON public.user_roles;

CREATE POLICY "authenticated deny insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "authenticated deny update user_roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "authenticated deny delete user_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (false);

-- write only by service_role
DROP POLICY IF EXISTS "service_role can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "service_role can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "service_role can delete user_roles" ON public.user_roles;

CREATE POLICY "service_role can insert user_roles"
ON public.user_roles FOR INSERT TO service_role
WITH CHECK (true);

CREATE POLICY "service_role can update user_roles"
ON public.user_roles FOR UPDATE TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "service_role can delete user_roles"
ON public.user_roles FOR DELETE TO service_role
USING (true);

-- 2) training_sessions: enforce row security + owner/coordinator update
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions FORCE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='training_sessions'
      AND cmd='UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_sessions', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "owner or coordinator update training sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    supervisor_id = auth.uid()
    OR public.is_coordinator(auth.uid())
  )
)
WITH CHECK (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    supervisor_id = auth.uid()
    OR public.is_coordinator(auth.uid())
  )
);