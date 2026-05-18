-- 1) Storage bucket for analysis prints (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-images', 'analysis-images', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Storage policies: per-company access via first folder = empresa_id
CREATE POLICY "Users can view own company analysis-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'analysis-images'
  AND (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Users can upload to own company analysis-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'analysis-images'
  AND (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Users can update own company analysis-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'analysis-images'
  AND (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Users can delete own company analysis-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'analysis-images'
  AND (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
);

-- Founder full access
CREATE POLICY "Founder full access analysis-images"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'analysis-images'
  AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
)
WITH CHECK (
  bucket_id = 'analysis-images'
  AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
);

-- 3) New columns on analyses
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS transcricao_extraida_raw text;

-- Helpful index for filtering by source type
CREATE INDEX IF NOT EXISTS idx_analyses_source_type ON public.analyses(source_type);