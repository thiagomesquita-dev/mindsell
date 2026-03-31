
-- Add onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create user_portfolios table
CREATE TABLE public.user_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  carteira text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, carteira)
);

ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- Users can view their own portfolios
CREATE POLICY "Users can view own portfolios"
  ON public.user_portfolios FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert own portfolios
CREATE POLICY "Users can insert own portfolios"
  ON public.user_portfolios FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete own portfolios
CREATE POLICY "Users can delete own portfolios"
  ON public.user_portfolios FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Allow users to update their own empresa_id during onboarding
-- (the existing update policy blocks empresa_id changes, we need to allow it when null)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow users to insert into companies during onboarding
CREATE POLICY "Users can create company"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to search companies by name
CREATE POLICY "Users can search companies"
  ON public.companies FOR SELECT TO authenticated
  USING (true);

-- Drop old restrictive select policy
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;

-- Allow users to manage their own roles during onboarding
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own role"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
