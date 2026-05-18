
CREATE TABLE public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  plan_code text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'inactive',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own company subscription
CREATE POLICY "Users can view own company subscription"
  ON public.company_subscriptions FOR SELECT
  TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

-- Founder can view all subscriptions
CREATE POLICY "Founder can view all subscriptions"
  ON public.company_subscriptions FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Service role inserts/updates via edge functions (no authenticated INSERT/UPDATE policies)
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- Trigger for updated_at
CREATE TRIGGER update_company_subscriptions_updated_at
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
