
CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Direct modification of empresa_id is not allowed';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT public.is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Only coordinators can change user status';
      END IF;
    END IF;
    IF NEW.onboarding_completed IS DISTINCT FROM OLD.onboarding_completed THEN
      RAISE EXCEPTION 'Direct modification of onboarding_completed is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
