
-- Remove the dangerous UPDATE policy that allows role self-escalation
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;

-- Create a secure function for role assignment during onboarding
CREATE OR REPLACE FUNCTION public.set_onboarding_role(_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_roles
  SET role = _role
  WHERE user_id = auth.uid();
END;
$$;
