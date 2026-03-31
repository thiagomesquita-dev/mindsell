
-- FIX 1: user_portfolios - remove self-assign INSERT policy, keep only coordinator INSERT
DROP POLICY IF EXISTS "Users can insert own portfolios" ON user_portfolios;

-- FIX 2: profiles - restrict company-wide profile viewing to coordinators only
DROP POLICY IF EXISTS "Admins can view company profiles" ON profiles;

CREATE POLICY "Coordinators can view company profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND is_coordinator(auth.uid())
);
