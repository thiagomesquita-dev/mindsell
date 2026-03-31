
-- Table to persist operator name mappings between file names and CobraMind operators
CREATE TABLE public.operator_name_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  operador_cobramind text NOT NULL,
  carteira text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, nome_arquivo)
);

-- Enable RLS
ALTER TABLE public.operator_name_mappings ENABLE ROW LEVEL SECURITY;

-- Coordinators can manage mappings
CREATE POLICY "Users can view company mappings"
  ON public.operator_name_mappings FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert mappings"
  ON public.operator_name_mappings FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Users can update mappings"
  ON public.operator_name_mappings FOR UPDATE
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Coordinators can delete mappings"
  ON public.operator_name_mappings FOR DELETE
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()));
