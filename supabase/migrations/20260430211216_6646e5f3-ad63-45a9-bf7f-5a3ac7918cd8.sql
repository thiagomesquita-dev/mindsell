-- Adiciona colunas de origem e dados de visitante
ALTER TABLE public.support_messages
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS visitor_name text,
  ADD COLUMN IF NOT EXISTS visitor_email text,
  ADD COLUMN IF NOT EXISTS visitor_whatsapp text,
  ALTER COLUMN user_id DROP NOT NULL;

-- Garante valores válidos para origin
ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_origin_check;
ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_origin_check
  CHECK (origin IN ('app', 'site'));

-- Garante coerência entre origem e identidade
ALTER TABLE public.support_messages
  DROP CONSTRAINT IF EXISTS support_messages_origin_identity_check;
ALTER TABLE public.support_messages
  ADD CONSTRAINT support_messages_origin_identity_check
  CHECK (
    (origin = 'app' AND user_id IS NOT NULL)
    OR (origin = 'site' AND user_id IS NULL AND empresa_id IS NULL
        AND visitor_email IS NOT NULL AND visitor_name IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_support_messages_origin ON public.support_messages(origin);

-- Ajusta políticas RLS para o app (mantém comportamento) e adiciona insert público para site
DROP POLICY IF EXISTS "Users can insert own support messages" ON public.support_messages;
CREATE POLICY "Users can insert own support messages (app)"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  origin = 'app'
  AND user_id = auth.uid()
  AND (empresa_id IS NULL OR empresa_id = get_user_empresa_id(auth.uid()))
);

-- Permite envio anônimo a partir do site institucional
CREATE POLICY "Anonymous can submit site support messages"
ON public.support_messages
FOR INSERT
TO anon
WITH CHECK (
  origin = 'site'
  AND user_id IS NULL
  AND empresa_id IS NULL
  AND visitor_name IS NOT NULL
  AND visitor_email IS NOT NULL
  AND length(message) BETWEEN 5 AND 4000
);

-- Também permite usuários autenticados enviarem como visitante a partir do site (ex.: founder testando)
CREATE POLICY "Authenticated can submit site support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  origin = 'site'
  AND user_id IS NULL
  AND empresa_id IS NULL
  AND visitor_name IS NOT NULL
  AND visitor_email IS NOT NULL
  AND length(message) BETWEEN 5 AND 4000
);