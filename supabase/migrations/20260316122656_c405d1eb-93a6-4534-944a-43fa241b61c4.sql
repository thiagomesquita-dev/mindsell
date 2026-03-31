
-- 1. Update complete_onboarding to assign 'gestor' instead of 'admin' for normal users
CREATE OR REPLACE FUNCTION public.complete_onboarding(_nome_empresa text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Prevent joining existing companies
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

  -- Promote to GESTOR (not admin) for normal coordination users
  UPDATE public.user_roles
  SET role = 'gestor'
  WHERE user_id = auth.uid();
END;
$function$;

-- 2. Update set_onboarding_role to assign 'gestor' instead of 'admin'
CREATE OR REPLACE FUNCTION public.set_onboarding_role(_role app_role DEFAULT 'gestor'::app_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Role already assigned';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND onboarding_completed = true
  ) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  -- Always assign gestor during onboarding (not admin)
  UPDATE public.user_roles
  SET role = 'gestor'
  WHERE user_id = auth.uid();
END;
$function$;
