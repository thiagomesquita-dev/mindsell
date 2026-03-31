-- Table for training sessions with public links
CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES public.companies(id) NOT NULL,
  operador text NOT NULL,
  supervisor_id uuid NOT NULL,
  supervisor_nome text NOT NULL DEFAULT '',
  carteira text NOT NULL DEFAULT '',
  training_content jsonb NOT NULL,
  resposta_operador text,
  reflexao_operador text,
  avaliacao_ia jsonb,
  nota_final numeric,
  qualidade_resposta text,
  entendimento text,
  coerencia text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  responded_at timestamptz
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company training sessions"
  ON public.training_sessions FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Authenticated users can insert training sessions"
  ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_user_empresa_id(auth.uid())
    AND supervisor_id = auth.uid()
  );

CREATE POLICY "Authenticated users can update training sessions"
  ON public.training_sessions FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Anyone can read by token"
  ON public.training_sessions FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anyone can submit response by token"
  ON public.training_sessions FOR UPDATE TO anon
  USING (status = 'pendente')
  WITH CHECK (status = 'respondido');

CREATE INDEX idx_training_sessions_token ON public.training_sessions(token);
CREATE INDEX idx_training_sessions_empresa ON public.training_sessions(empresa_id);
CREATE INDEX idx_training_sessions_status ON public.training_sessions(status);