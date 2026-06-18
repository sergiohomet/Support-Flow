-- Migration: 20260615000002_add_get_my_profile
-- Purpose: Add get_my_profile() RPC for authenticated profile loading.
--          Returns id, email, full_name, role for the current user.

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id        uuid,
  email     text,
  full_name text,
  role      public.user_role
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, email, full_name, role
  FROM public.users
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
