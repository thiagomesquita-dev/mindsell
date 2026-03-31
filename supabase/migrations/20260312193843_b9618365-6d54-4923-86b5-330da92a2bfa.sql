
-- 1. Add slug and status to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';
CREATE UNIQUE INDEX IF NOT EXISTS companies_slug_unique ON public.companies(slug) WHERE slug IS NOT NULL;

-- 2. Create helper function: check if user is coordinator (admin/gestor/founder)
CREATE OR REPLACE FUNCTION public.is_coordinator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'gestor', 'founder')
  )
$$;

-- 3. Create helper function: check if supervisor has access to a carteira
CREATE OR REPLACE FUNCTION public.user_has_carteira_access(_user_id uuid, _carteira text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_portfolios
    WHERE user_id = _user_id AND carteira = _carteira
  )
$$;

-- 4. Tighten analyses SELECT: supervisors only see their portfolios
DROP POLICY IF EXISTS "Users can view company analyses" ON public.analyses;
CREATE POLICY "Users can view company analyses" ON public.analyses
FOR SELECT TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR public.user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 5. Tighten operators SELECT: supervisors only see operators in their portfolios
DROP POLICY IF EXISTS "Users can view company operators" ON public.operators;
CREATE POLICY "Users can view company operators" ON public.operators
FOR SELECT TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR public.user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 6. Tighten operators INSERT: only for user's portfolios
DROP POLICY IF EXISTS "Supervisors can insert operators" ON public.operators;
CREATE POLICY "Users can insert operators" ON public.operators
FOR INSERT TO authenticated
WITH CHECK (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR public.user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 7. Tighten operators UPDATE: only for user's portfolios
DROP POLICY IF EXISTS "Supervisors can update operators" ON public.operators;
CREATE POLICY "Users can update operators" ON public.operators
FOR UPDATE TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR public.user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 8. Tighten analyses INSERT: supervisor can only insert for their portfolios
DROP POLICY IF EXISTS "Users can insert analyses" ON public.analyses;
CREATE POLICY "Users can insert analyses" ON public.analyses
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR public.user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 9. Coordinator-level access to user_portfolios (to manage team assignments)
CREATE POLICY "Coordinators can view company portfolios" ON public.user_portfolios
FOR SELECT TO authenticated
USING (
  public.is_coordinator(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolios.user_id
    AND profiles.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

-- 10. Coordinator can manage user_portfolios for their company
CREATE POLICY "Coordinators can insert portfolios" ON public.user_portfolios
FOR INSERT TO authenticated
WITH CHECK (
  public.is_coordinator(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolios.user_id
    AND profiles.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

CREATE POLICY "Coordinators can delete portfolios" ON public.user_portfolios
FOR DELETE TO authenticated
USING (
  public.is_coordinator(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolios.user_id
    AND profiles.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

-- 11. Tighten operator_cycles: supervisor portfolio filtering
DROP POLICY IF EXISTS "Users can view company cycles" ON public.operator_cycles;
CREATE POLICY "Users can view company cycles" ON public.operator_cycles
FOR SELECT TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id = ANY(operator_cycles.analysis_ids)
      AND public.user_has_carteira_access(auth.uid(), a.carteira)
      LIMIT 1
    )
  )
);

-- 12. Tighten weekly_reports: supervisor portfolio filtering
DROP POLICY IF EXISTS "Users can view company weekly reports" ON public.weekly_reports;
CREATE POLICY "Users can view company weekly reports" ON public.weekly_reports
FOR SELECT TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.is_coordinator(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id = ANY(weekly_reports.analysis_ids)
      AND public.user_has_carteira_access(auth.uid(), a.carteira)
      LIMIT 1
    )
  )
);
