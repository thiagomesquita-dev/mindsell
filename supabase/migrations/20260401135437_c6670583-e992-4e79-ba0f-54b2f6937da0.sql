
-- Exchange rates cache table
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair text NOT NULL DEFAULT 'USD_BRL',
  rate numeric NOT NULL,
  rate_date date NOT NULL,
  source text NOT NULL DEFAULT 'bcb_ptax',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (currency_pair, rate_date, source)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read exchange rates"
  ON public.exchange_rates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can insert exchange rates"
  ON public.exchange_rates FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add FX columns to ai_usage_logs
ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS fx_rate_brl numeric,
  ADD COLUMN IF NOT EXISTS estimated_cost_brl numeric,
  ADD COLUMN IF NOT EXISTS fx_source text,
  ADD COLUMN IF NOT EXISTS fx_date date;
