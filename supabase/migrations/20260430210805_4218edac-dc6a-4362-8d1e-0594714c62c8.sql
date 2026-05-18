CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid,
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  subject_type text NOT NULL,
  message text NOT NULL,
  page_path text,
  wants_whatsapp_contact boolean NOT NULL DEFAULT false,
  whatsapp_contact text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_support_messages_empresa ON public.support_messages(empresa_id);
CREATE INDEX idx_support_messages_user ON public.support_messages(user_id);
CREATE INDEX idx_support_messages_status ON public.support_messages(status);

-- Trigger updated_at
CREATE TRIGGER set_support_messages_updated_at
BEFORE UPDATE ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
CREATE POLICY "Users can insert own support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (empresa_id IS NULL OR empresa_id = get_user_empresa_id(auth.uid()))
);

CREATE POLICY "Users can view own support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Coordinators can view company support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (
  empresa_id IS NOT NULL
  AND empresa_id = get_user_empresa_id(auth.uid())
  AND is_coordinator(auth.uid())
);

CREATE POLICY "Founder can view all support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can update support messages"
ON public.support_messages
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br')
WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Coordinators can update company support messages"
ON public.support_messages
FOR UPDATE
TO authenticated
USING (
  empresa_id IS NOT NULL
  AND empresa_id = get_user_empresa_id(auth.uid())
  AND is_coordinator(auth.uid())
);