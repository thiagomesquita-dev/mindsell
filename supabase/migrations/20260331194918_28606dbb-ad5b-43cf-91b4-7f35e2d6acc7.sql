
-- Drop the existing unique constraint
ALTER TABLE public.company_carteiras DROP CONSTRAINT company_carteiras_empresa_id_nome_key;

-- Create normalized unique index (case-insensitive, trimmed)
CREATE UNIQUE INDEX company_carteiras_empresa_id_nome_key
ON public.company_carteiras (empresa_id, upper(trim(nome)));

-- Add trigger to auto-normalize nome on insert/update
CREATE OR REPLACE FUNCTION public.normalize_carteira_nome()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.nome := upper(trim(regexp_replace(NEW.nome, '\s+', ' ', 'g')));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_carteira_nome ON public.company_carteiras;
CREATE TRIGGER trg_normalize_carteira_nome
  BEFORE INSERT OR UPDATE ON public.company_carteiras
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_carteira_nome();
