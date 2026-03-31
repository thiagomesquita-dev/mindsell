
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_portfolio_rules_carteira()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.carteira := upper(trim(NEW.carteira));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_portfolio_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
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
