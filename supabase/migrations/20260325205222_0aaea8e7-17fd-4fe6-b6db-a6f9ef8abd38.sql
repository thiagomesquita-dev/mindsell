
-- 1. Add is_active column
ALTER TABLE public.portfolio_negotiation_rules
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Trigger: auto-set updated_at on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portfolio_rules_updated_at
  BEFORE UPDATE ON public.portfolio_negotiation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Trigger: auto-set created_by/updated_by via auth.uid()
CREATE OR REPLACE FUNCTION public.set_portfolio_rules_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portfolio_rules_audit
  BEFORE INSERT OR UPDATE ON public.portfolio_negotiation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_portfolio_rules_audit();

-- 4. Trigger: normalize carteira (trim + upper)
CREATE OR REPLACE FUNCTION public.normalize_portfolio_rules_carteira()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.carteira := upper(trim(NEW.carteira));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portfolio_rules_normalize_carteira
  BEFORE INSERT OR UPDATE ON public.portfolio_negotiation_rules
  FOR EACH ROW EXECUTE FUNCTION public.normalize_portfolio_rules_carteira();

-- 5. Validation trigger for approach_objective (instead of CHECK for safety)
CREATE OR REPLACE FUNCTION public.validate_portfolio_rules()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.approach_objective NOT IN ('fechamento','retencao','triagem','encaminhamento','cobranca_com_proposta','cobranca_informativa') THEN
    RAISE EXCEPTION 'approach_objective inválido: %', NEW.approach_objective;
  END IF;
  IF NEW.evaluation_criteria IS NULL OR jsonb_typeof(NEW.evaluation_criteria) != 'array' THEN
    RAISE EXCEPTION 'evaluation_criteria deve ser um array JSON válido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_portfolio_rules_validate
  BEFORE INSERT OR UPDATE ON public.portfolio_negotiation_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_portfolio_rules();

-- 6. Drop existing policies and recreate with proper founder access and WITH CHECK

-- SELECT
DROP POLICY IF EXISTS "Coordinators can view company rules" ON public.portfolio_negotiation_rules;
DROP POLICY IF EXISTS "Supervisors can view own portfolio rules" ON public.portfolio_negotiation_rules;

CREATE POLICY "Founder can view all rules"
  ON public.portfolio_negotiation_rules FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

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

-- INSERT
DROP POLICY IF EXISTS "Coordinators can insert rules" ON public.portfolio_negotiation_rules;
DROP POLICY IF EXISTS "Supervisors can insert own portfolio rules" ON public.portfolio_negotiation_rules;

CREATE POLICY "Founder can insert rules"
  ON public.portfolio_negotiation_rules FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

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

-- UPDATE (with USING + WITH CHECK)
DROP POLICY IF EXISTS "Coordinators can update rules" ON public.portfolio_negotiation_rules;
DROP POLICY IF EXISTS "Supervisors can update own portfolio rules" ON public.portfolio_negotiation_rules;

CREATE POLICY "Founder can update rules"
  ON public.portfolio_negotiation_rules FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br')
  WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Coordinators can update rules"
  ON public.portfolio_negotiation_rules FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()))
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()));

CREATE POLICY "Supervisors can update own portfolio rules"
  ON public.portfolio_negotiation_rules FOR UPDATE TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()) AND user_has_carteira_access(auth.uid(), carteira))
  WITH CHECK (empresa_id = get_user_empresa_id(auth.uid()) AND user_has_carteira_access(auth.uid(), carteira));

-- DELETE
DROP POLICY IF EXISTS "Coordinators can delete rules" ON public.portfolio_negotiation_rules;

CREATE POLICY "Founder can delete rules"
  ON public.portfolio_negotiation_rules FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Coordinators can delete rules"
  ON public.portfolio_negotiation_rules FOR DELETE TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()) AND is_coordinator(auth.uid()));
