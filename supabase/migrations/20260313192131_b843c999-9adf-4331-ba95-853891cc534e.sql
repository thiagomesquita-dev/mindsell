
-- 1. Replace the UPDATE policy on profiles: simplify to just own-row check
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 2. Trigger to block sensitive field changes from regular authenticated users
-- SECURITY DEFINER functions (complete_onboarding, criar-supervisor) run as owner,
-- so current_user != 'authenticated' lets them through.
CREATE OR REPLACE FUNCTION prevent_sensitive_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only enforce for regular authenticated users, not SECURITY DEFINER functions
  IF current_user = 'authenticated' THEN
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Direct modification of empresa_id is not allowed';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT is_coordinator(auth.uid()) THEN
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

DROP TRIGGER IF EXISTS trg_prevent_sensitive_profile_changes ON profiles;
CREATE TRIGGER trg_prevent_sensitive_profile_changes
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_sensitive_profile_changes();
