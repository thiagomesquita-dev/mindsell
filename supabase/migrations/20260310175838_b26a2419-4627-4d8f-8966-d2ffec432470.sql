
-- Fix 1: Drop all RESTRICTIVE policies and recreate as PERMISSIVE (default)
-- Companies
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company"
ON public.companies FOR SELECT TO authenticated
USING (id = public.get_user_empresa_id(auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view company profiles" ON public.profiles;
CREATE POLICY "Admins can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Fix 2: Fix update policy to prevent empresa_id escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid() AND empresa_id IS NOT DISTINCT FROM public.get_user_empresa_id(auth.uid()));

-- User roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Analyses
DROP POLICY IF EXISTS "Users can view company analyses" ON public.analyses;
CREATE POLICY "Users can view company analyses"
ON public.analyses FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

DROP POLICY IF EXISTS "Users can insert analyses" ON public.analyses;
CREATE POLICY "Users can insert analyses"
ON public.analyses FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND empresa_id = public.get_user_empresa_id(auth.uid())
);

DROP POLICY IF EXISTS "Users can update own analyses" ON public.analyses;
CREATE POLICY "Users can update own analyses"
ON public.analyses FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Storage
DROP POLICY IF EXISTS "Authenticated users can upload audios" ON storage.objects;
CREATE POLICY "Authenticated users can upload audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audios');

DROP POLICY IF EXISTS "Users can view own audios" ON storage.objects;
CREATE POLICY "Users can view own audios"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audios');
