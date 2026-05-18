
-- 1. Fix training_sessions UPDATE policy: restrict to owner or coordinator
DROP POLICY IF EXISTS "Authenticated users can update training sessions" ON public.training_sessions;

CREATE POLICY "Users can update own or coordinated training sessions"
ON public.training_sessions FOR UPDATE TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND (supervisor_id = auth.uid() OR is_coordinator(auth.uid()))
);

-- 2. Fix ai_model_config_history: remove overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert config history" ON public.ai_model_config_history;

-- 3. Fix audios bucket: remove duplicate INSERT policy
DROP POLICY IF EXISTS "Users can upload audios to own company folder" ON storage.objects;

-- 4. Add missing UPDATE policy for audios bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can update audios in own company folder'
  ) THEN
    CREATE POLICY "Users can update audios in own company folder"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'audios'
      AND (storage.foldername(name))[1] = (get_user_empresa_id(auth.uid()))::text
    );
  END IF;
END $$;
