
-- 1. analyses SELECT: allow multi-company members
DROP POLICY IF EXISTS "Users can view company analyses" ON analyses;
CREATE POLICY "Users can view company analyses"
ON analyses FOR SELECT TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    is_coordinator(auth.uid())
    OR user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 2. training_sessions SELECT
DROP POLICY IF EXISTS "Users can view company training sessions" ON training_sessions;
CREATE POLICY "Users can view company training sessions"
ON training_sessions FOR SELECT TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    is_coordinator(auth.uid())
    OR user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 3. operators SELECT
DROP POLICY IF EXISTS "Users can view company operators" ON operators;
CREATE POLICY "Users can view company operators"
ON operators FOR SELECT TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    is_coordinator(auth.uid())
    OR user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 4. weekly_reports SELECT
DROP POLICY IF EXISTS "Users can view company weekly reports" ON weekly_reports;
CREATE POLICY "Users can view company weekly reports"
ON weekly_reports FOR SELECT TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    is_coordinator(auth.uid())
    OR (EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = ANY(weekly_reports.analysis_ids)
        AND user_has_carteira_access(auth.uid(), a.carteira)
      LIMIT 1
    ))
  )
);

-- 5. operator_cycles SELECT
DROP POLICY IF EXISTS "Users can view company cycles" ON operator_cycles;
CREATE POLICY "Users can view company cycles"
ON operator_cycles FOR SELECT TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    is_coordinator(auth.uid())
    OR (EXISTS (
      SELECT 1 FROM analyses a
      WHERE a.id = ANY(operator_cycles.analysis_ids)
        AND user_has_carteira_access(auth.uid(), a.carteira)
      LIMIT 1
    ))
  )
);

-- 6. company_carteiras SELECT
DROP POLICY IF EXISTS "Users can view company carteiras" ON company_carteiras;
CREATE POLICY "Users can view company carteiras"
ON company_carteiras FOR SELECT TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  OR user_belongs_to_company(auth.uid(), empresa_id)
);

-- 7. ai_usage_logs SELECT for coordinators
DROP POLICY IF EXISTS "Coordinators can view company ai_usage_logs" ON ai_usage_logs;
CREATE POLICY "Coordinators can view company ai_usage_logs"
ON ai_usage_logs FOR SELECT TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND is_coordinator(auth.uid())
);

-- 8. operators UPDATE for multi-company
DROP POLICY IF EXISTS "Users can update operators" ON operators;
CREATE POLICY "Users can update operators"
ON operators FOR UPDATE TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    is_coordinator(auth.uid())
    OR user_has_carteira_access(auth.uid(), carteira)
  )
);

-- 9. training_sessions UPDATE for multi-company
DROP POLICY IF EXISTS "Users can update own or coordinated training sessions" ON training_sessions;
CREATE POLICY "Users can update own or coordinated training sessions"
ON training_sessions FOR UPDATE TO authenticated
USING (
  (
    empresa_id = get_user_empresa_id(auth.uid())
    OR user_belongs_to_company(auth.uid(), empresa_id)
  )
  AND (
    supervisor_id = auth.uid()
    OR is_coordinator(auth.uid())
  )
);
