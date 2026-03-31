
DROP POLICY IF EXISTS "Users can view company training sessions" ON public.training_sessions;

CREATE POLICY "Users can view company training sessions"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (
  empresa_id = get_user_empresa_id(auth.uid())
  AND (
    is_coordinator(auth.uid())
    OR user_has_carteira_access(auth.uid(), carteira)
  )
);
