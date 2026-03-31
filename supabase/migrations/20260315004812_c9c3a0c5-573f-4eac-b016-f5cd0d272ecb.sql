
-- Update the function to also protect email changes
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Direct modification of empresa_id is not allowed';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Direct modification of email is not allowed';
    END IF;
    IF NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed THEN
      RAISE EXCEPTION 'Direct modification of onboarding_completed is not allowed';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT public.is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Only coordinators can change user status';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Attach the trigger to profiles table
DROP TRIGGER IF EXISTS prevent_sensitive_profile_changes ON public.profiles;
CREATE TRIGGER prevent_sensitive_profile_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_sensitive_profile_changes();
