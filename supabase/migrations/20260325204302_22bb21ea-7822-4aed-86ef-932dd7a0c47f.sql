
-- Table: portfolio_negotiation_rules
CREATE TABLE public.portfolio_negotiation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  carteira text NOT NULL,
  
  -- Alçada de Negociação
  can_offer_discount boolean NOT NULL DEFAULT true,
  can_offer_installments boolean NOT NULL DEFAULT true,
  can_confirm_payment_date boolean NOT NULL DEFAULT true,
  can_generate_boleto boolean NOT NULL DEFAULT true,
  can_discuss_reactivation boolean NOT NULL DEFAULT false,
  can_promise_plan_maintenance boolean NOT NULL DEFAULT false,
  can_close_on_first_contact boolean NOT NULL DEFAULT true,
  
  -- Restrições (text fields)
  negotiation_possible_conditions text DEFAULT '',
  non_negotiable_cases text DEFAULT '',
  forbidden_terms text DEFAULT '',
  mandatory_guidelines text DEFAULT '',
  
  -- Objetivo da abordagem
  approach_objective text DEFAULT 'fechamento',
  
  -- Critérios de avaliação (jsonb array of strings)
  evaluation_criteria jsonb DEFAULT '["fechamento","contorno_objecoes","tentativa_compromisso","confirmacao_data","proposta_financeira","orientacao_correta"]'::jsonb,
  
  -- Casos sem negociação elegível
  exclude_from_score_conditions text DEFAULT '',
  
  -- Observações
  observations text DEFAULT '',
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- One rule set per carteira per company
  UNIQUE(empresa_id, carteira)
);

-- Enable RLS
ALTER TABLE public.portfolio_negotiation_rules ENABLE ROW LEVEL SECURITY;

-- SELECT: coordination sees all company rules, supervisors see only their portfolios
CREATE POLICY "Coordinators can view company rules"
  ON public.portfolio_negotiation_rules FOR SELECT TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );

CREATE POLICY "Supervisors can view own portfolio rules"
  ON public.portfolio_negotiation_rules FOR SELECT TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND user_has_carteira_access(auth.uid(), carteira)
  );

-- INSERT: coordination can create any, supervisors only their portfolios
CREATE POLICY "Coordinators can insert rules"
  ON public.portfolio_negotiation_rules FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );

CREATE POLICY "Supervisors can insert own portfolio rules"
  ON public.portfolio_negotiation_rules FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_user_empresa_id(auth.uid())
    AND user_has_carteira_access(auth.uid(), carteira)
  );

-- UPDATE: coordination can update any, supervisors only their portfolios
CREATE POLICY "Coordinators can update rules"
  ON public.portfolio_negotiation_rules FOR UPDATE TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );

CREATE POLICY "Supervisors can update own portfolio rules"
  ON public.portfolio_negotiation_rules FOR UPDATE TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND user_has_carteira_access(auth.uid(), carteira)
  );

-- DELETE: only coordination
CREATE POLICY "Coordinators can delete rules"
  ON public.portfolio_negotiation_rules FOR DELETE TO authenticated
  USING (
    empresa_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );

-- Index for fast lookup during analysis
CREATE INDEX idx_portfolio_rules_empresa_carteira
  ON public.portfolio_negotiation_rules(empresa_id, carteira);
