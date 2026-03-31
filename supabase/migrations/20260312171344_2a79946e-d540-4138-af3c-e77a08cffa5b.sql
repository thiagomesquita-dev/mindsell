
-- 1. Add status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';

-- 2. Company-managed carteiras
CREATE TABLE public.company_carteiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, nome)
);

ALTER TABLE public.company_carteiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company carteiras"
  ON public.company_carteiras FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Coordination can insert carteiras"
  ON public.company_carteiras FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_user_empresa_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  );

CREATE POLICY "Coordination can update carteiras"
  ON public.company_carteiras FOR UPDATE TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'))
  );

-- 3. Operators table (not system users)
CREATE TABLE public.operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome text NOT NULL,
  carteira text NOT NULL,
  status text NOT NULL DEFAULT 'ativo',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company operators"
  ON public.operators FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Supervisors can insert operators"
  ON public.operators FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Supervisors can update operators"
  ON public.operators FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));
