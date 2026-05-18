
-- 1. Fix coordinator role escalation: restrict which roles can be assigned
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Only founder or coordinators can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only founder or coordinators can update roles" ON public.user_roles;

-- Founder can assign ANY role
CREATE POLICY "Founder can insert any role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
  );

CREATE POLICY "Founder can update any role"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
  );

-- Coordinators can only assign supervisor or gestor roles (not admin/founder)
CREATE POLICY "Coordinators can insert limited roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    is_coordinator(auth.uid())
    AND role IN ('supervisor', 'gestor')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.empresa_id = get_user_empresa_id(auth.uid())
    )
  );

CREATE POLICY "Coordinators can update limited roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    is_coordinator(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.empresa_id = get_user_empresa_id(auth.uid())
    )
  )
  WITH CHECK (
    is_coordinator(auth.uid())
    AND role IN ('supervisor', 'gestor')
  );

-- Restrict DELETE similarly: coordinators can only delete non-founder/admin roles within their company
DROP POLICY IF EXISTS "Only founder or coordinators can delete roles" ON public.user_roles;

CREATE POLICY "Founder can delete any role"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br'
  );

CREATE POLICY "Coordinators can delete limited roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    is_coordinator(auth.uid())
    AND role IN ('supervisor', 'gestor')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id
        AND p.empresa_id = get_user_empresa_id(auth.uid())
    )
  );

-- 2. Add SELECT policies for analysis_reanalyses
-- Coordinators can view reanalyses for their company's analyses
CREATE POLICY "Coordinators can view company reanalyses"
  ON public.analysis_reanalyses FOR SELECT TO authenticated
  USING (
    is_coordinator(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id = analysis_reanalyses.analysis_id
        AND (a.empresa_id = get_user_empresa_id(auth.uid())
             OR user_belongs_to_company(auth.uid(), a.empresa_id))
    )
  );

-- Users can view their own reanalyses
CREATE POLICY "Users can view own reanalyses"
  ON public.analysis_reanalyses FOR SELECT TO authenticated
  USING (user_id = auth.uid());
