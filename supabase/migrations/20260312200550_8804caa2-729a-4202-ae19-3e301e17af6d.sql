
-- Update set_onboarding_role to always assign 'admin' (no parameter needed)
CREATE OR REPLACE FUNCTION public.set_onboarding_role(_role app_role DEFAULT 'admin')
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow during onboarding: user must still have default 'supervisor' role
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Role already assigned';
  END IF;

  -- Check that onboarding is not yet completed
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND onboarding_completed = true
  ) THEN
    RAISE EXCEPTION 'Onboarding already completed';
  END IF;

  -- Always assign admin during onboarding (ignore parameter)
  UPDATE public.user_roles
  SET role = 'admin'
  WHERE user_id = auth.uid();
END;
$function$;
