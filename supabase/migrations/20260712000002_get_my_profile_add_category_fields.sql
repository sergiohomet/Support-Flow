-- Migration: 20260712000002_get_my_profile_add_category_fields
-- Purpose: Extend get_my_profile() to also return category_id/category_name
--          so the agent dashboard can display the caller's own category
--          without a second round-trip.
--
-- CREATE OR REPLACE cannot change a function's RETURNS TABLE shape, so the
-- function is dropped and recreated. All previously returned columns
-- (id, email, full_name, role, is_active) are preserved unchanged from
-- 20260623000001_update_get_my_profile_add_is_active.sql — only category_id
-- and category_name are added.

DROP FUNCTION public.get_my_profile();

CREATE FUNCTION public.get_my_profile()
RETURNS TABLE(
  id            uuid,
  email         text,
  full_name     text,
  role          public.user_role,
  is_active     boolean,
  category_id   uuid,
  category_name text
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
    u.is_active,
    u.category_id,
    c.name::text AS category_name
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  LEFT JOIN public.categories c ON c.id = u.category_id
  WHERE u.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
