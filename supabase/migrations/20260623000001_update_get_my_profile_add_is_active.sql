-- Migration: 20260623000001_update_get_my_profile_add_is_active
-- Purpose: Extend get_my_profile() to also return is_active so the client
--          can gate login for deactivated accounts post-auth-session creation.

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id        uuid,
  email     text,
  full_name text,
  role      public.user_role,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    u.id,
    au.email::text,
    u.full_name::text,
    u.role,
    u.is_active
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
