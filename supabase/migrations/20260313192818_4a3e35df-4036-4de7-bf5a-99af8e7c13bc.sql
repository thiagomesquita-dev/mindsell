
-- =============================================
-- 1. STORAGE: Isolate audios bucket by empresa_id
-- =============================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own audios" ON storage.objects;
DROP POLICY IF EXISTS "Users can read audios from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload audios to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete audios from their company folder" ON storage.objects;

CREATE POLICY "Users can read audios from their company"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audios'
  AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Users can upload audios to their company folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audios'
  AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Users can delete audios from their company folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audios'
  AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

-- =============================================
-- 2. OPERATOR_CYCLES: Require coordinator role
-- =============================================

DROP POLICY IF EXISTS "Service can insert cycles" ON operator_cycles;
DROP POLICY IF EXISTS "Service can update cycles" ON operator_cycles;

CREATE POLICY "Coordinators can insert cycles"
ON operator_cycles FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = get_user_empresa_id(auth.uid())
  AND is_coordinator(auth.uid())
);

CREATE POLICY "Coordinators can update cycles"
ON operator_cycles FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND is_coordinator(auth.uid())
);

-- =============================================
-- 4. COMPANIES INSERT: Remove WITH CHECK (true)
-- =============================================

DROP POLICY IF EXISTS "Users can create company" ON companies;

-- Only allow insert during onboarding (via SECURITY DEFINER function complete_onboarding).
-- Regular authenticated users should not insert companies directly.
-- The complete_onboarding function runs as owner, bypassing RLS.
-- But we still need a policy for the function context - restrict to users without a company.
CREATE POLICY "Users can create company during onboarding"
ON companies FOR INSERT TO authenticated
WITH CHECK (
  -- Only users who haven't completed onboarding yet
  NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND onboarding_completed = true
  )
);
