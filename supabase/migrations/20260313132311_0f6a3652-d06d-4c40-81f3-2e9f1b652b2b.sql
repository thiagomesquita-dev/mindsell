
-- 1. Restrict companies SELECT to own company only
DROP POLICY IF EXISTS "Users can search companies" ON public.companies;
CREATE POLICY "Users can view own company"
ON public.companies FOR SELECT TO authenticated
USING (id = public.get_user_empresa_id(auth.uid()));

-- 2. Restrict profiles UPDATE to prevent changing empresa_id to any arbitrary value
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    -- empresa_id unchanged
    empresa_id IS NOT DISTINCT FROM (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid())
    -- OR user has no empresa_id yet (onboarding)
    OR (SELECT p.empresa_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
  )
);

-- 3. Create secure onboarding RPC that ONLY creates new companies
CREATE OR REPLACE FUNCTION public.complete_onboarding(_nome_empresa text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _empresa_id uuid;
  _normalized text;
BEGIN
  -- Must not have completed onboarding yet
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND onboarding_completed = true
  ) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  -- Must still have default supervisor role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Role already assigned';
  END IF;

  -- Must not already belong to a company
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND empresa_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Already belongs to a company';
  END IF;

  -- Normalize company name
  _normalized := upper(trim(regexp_replace(_nome_empresa, '\s+', ' ', 'g')));

  IF length(_normalized) < 2 THEN
    RAISE EXCEPTION 'Company name too short';
  END IF;

  -- Prevent joining existing companies - always create new
  IF EXISTS (
    SELECT 1 FROM public.companies WHERE nome_empresa = _normalized
  ) THEN
    RAISE EXCEPTION 'Uma empresa com esse nome já existe. Solicite um convite ao administrador.';
  END IF;

  -- Create new company
  INSERT INTO public.companies (nome_empresa)
  VALUES (_normalized)
  RETURNING id INTO _empresa_id;

  -- Link profile to new company and mark onboarding complete
  UPDATE public.profiles
  SET empresa_id = _empresa_id, onboarding_completed = true
  WHERE id = auth.uid();

  -- Promote to admin
  UPDATE public.user_roles
  SET role = 'admin'
  WHERE user_id = auth.uid();
END;
$$;
