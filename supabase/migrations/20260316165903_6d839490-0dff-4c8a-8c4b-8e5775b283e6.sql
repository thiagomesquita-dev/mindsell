-- Allow coordinators to view roles of users in the same company
CREATE POLICY "Coordinators can view company user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  is_coordinator(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_roles.user_id
      AND p.empresa_id = get_user_empresa_id(auth.uid())
  )
);