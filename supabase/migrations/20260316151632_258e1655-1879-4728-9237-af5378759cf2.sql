-- Fix: Set Thiago's empresa_id to the same company as Cassia/Daniele
-- and mark onboarding as completed
-- This runs as postgres superuser, bypassing the prevent_sensitive_profile_changes trigger

UPDATE public.profiles
SET empresa_id = '51392b8d-f80a-4039-a617-5d673a90cf54',
    onboarding_completed = true
WHERE id = 'fd920162-a1b3-41e0-ad50-f0ad484813b2'
  AND empresa_id IS NULL;