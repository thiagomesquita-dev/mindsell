
-- 1. Create company_memberships table
CREATE TABLE public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'supervisor',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, company_id)
);

-- 2. Enable RLS
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can view own memberships"
  ON public.company_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Founder can view all memberships"
  ON public.company_memberships FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Coordinators can view company memberships"
  ON public.company_memberships FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );

CREATE POLICY "Founder can insert memberships"
  ON public.company_memberships FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can update memberships"
  ON public.company_memberships FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Founder can delete memberships"
  ON public.company_memberships FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

CREATE POLICY "Coordinators can insert memberships for own company"
  ON public.company_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_empresa_id(auth.uid())
    AND is_coordinator(auth.uid())
  );

-- 4. Migrate existing data: for each profile with empresa_id + user_roles, create a membership
INSERT INTO public.company_memberships (user_id, company_id, role)
SELECT p.id, p.empresa_id, ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.empresa_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 5. Create helper function to check membership
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND is_active = true
  )
$$;

-- 6. Function to get user role in a specific company
CREATE OR REPLACE FUNCTION public.get_user_role_in_company(_user_id uuid, _company_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.company_memberships
  WHERE user_id = _user_id
    AND company_id = _company_id
    AND is_active = true
  LIMIT 1
$$;

-- 7. Function to get all companies for a user
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_memberships
  WHERE user_id = _user_id
    AND is_active = true
$$;
