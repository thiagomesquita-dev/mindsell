-- 1. DROP overly-permissive anon policies on training_sessions
DROP POLICY IF EXISTS "Anyone can read by token" ON public.training_sessions;
DROP POLICY IF EXISTS "Anyone can submit response by token" ON public.training_sessions;

-- 2. Create SECURITY DEFINER function to fetch training by token (anon-safe)
CREATE OR REPLACE FUNCTION public.get_training_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  token text,
  operador text,
  supervisor_nome text,
  carteira text,
  training_content jsonb,
  status text,
  expires_at timestamptz,
  avaliacao_ia jsonb,
  resposta_operador text,
  reflexao_operador text,
  resposta_interpretacao text,
  resposta_decisao text,
  origem training_origem
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ts.id, ts.token, ts.operador, ts.supervisor_nome, ts.carteira,
    ts.training_content, ts.status, ts.expires_at, ts.avaliacao_ia,
    ts.resposta_operador, ts.reflexao_operador,
    ts.resposta_interpretacao, ts.resposta_decisao, ts.origem
  FROM public.training_sessions ts
  WHERE ts.token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_training_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_training_by_token(text) TO authenticated;

-- 3. Fix ai_usage_logs INSERT policy to require empresa_id match
DROP POLICY IF EXISTS "Authenticated can insert ai_usage_logs" ON public.ai_usage_logs;

CREATE POLICY "Authenticated can insert ai_usage_logs"
ON public.ai_usage_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND empresa_id = get_user_empresa_id(auth.uid())
);

-- 4. Add SELECT policies for ai_usage_logs (coordinators see company logs)
CREATE POLICY "Coordinators can view company ai_usage_logs"
ON public.ai_usage_logs FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND is_coordinator(auth.uid())
);

-- 5. Storage policies for audios bucket
CREATE POLICY "Users can upload audios to own company folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audios'
  AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Users can view audios from own company folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audios'
  AND (storage.foldername(name))[1] = get_user_empresa_id(auth.uid())::text
);

CREATE POLICY "Founder can view all audios"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audios'
  AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
);

CREATE POLICY "Founder can upload all audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audios'
  AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
);