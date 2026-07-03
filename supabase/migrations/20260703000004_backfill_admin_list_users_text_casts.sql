-- ============================================================
-- MIGRATION 20260703000004 — Backfill: admin_list_users text casts
-- SupportFlow Helpdesk
--
-- Repo-hygiene backfill (2026-07-03). Confirmed via comparing the live
-- DB against every local migration file: a live-only migration
-- (fix_admin_list_users_return_type, applied 2026-06-23, never saved
-- as a file anywhere in this repo) added ::text casts to full_name
-- and specialty in admin_list_users. Without this, a fresh database
-- built from local migrations alone would define admin_list_users
-- with a VARCHAR/TEXT return-type mismatch (Postgres error) instead
-- of the working, currently-live version below.
--
-- This migration reproduces the CURRENT live definition exactly
-- (verified via pg_get_functiondef against the live DB before writing
-- this file) — applying it is a no-op against production, it only
-- closes the gap for anyone rebuilding from these files alone.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_role      public.user_role default null,
  p_search    text             default null,
  p_is_active boolean          default null,
  p_page      int              default 1,
  p_page_size int              default 20
)
RETURNS TABLE (
  id          uuid,
  email       text,
  full_name   text,
  avatar_url  text,
  role        public.user_role,
  specialty   text,
  is_active   boolean,
  created_at  timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
BEGIN
  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    au.email::text,
    u.full_name::text,
    u.avatar_url,
    u.role,
    u.specialty::text,
    u.is_active,
    u.created_at,
    count(*) over () as total_count
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE
    (p_role is null or u.role = p_role)
    and (p_is_active is null or u.is_active = p_is_active)
    and (
      p_search is null
      or u.full_name ilike '%' || p_search || '%'
      or au.email ilike '%' || p_search || '%'
    )
  ORDER BY u.created_at desc
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(public.user_role, text, boolean, int, int) TO authenticated;
