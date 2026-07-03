-- ============================================================
-- MIGRATION 20260703000009 — Cleanup after specialty->category_id
-- SupportFlow Helpdesk
--
-- CREATE OR REPLACE FUNCTION admin_update_user_role with an added
-- trailing parameter created a NEW 3-arg overload alongside the OLD
-- 2-arg one (Postgres identifies functions by name + full arg type
-- list, not just name) — the stale 2-arg version doesn't know about
-- category_id and would violate users_category_id_only_for_agents
-- with a confusing constraint error instead of a clean business
-- exception. Drop it.
--
-- Also closes the default PUBLIC execute grant that Postgres applies
-- to newly (re)created functions, matching this project's established
-- convention of restricting sensitive RPCs to `authenticated` only.
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_update_user_role(uuid, public.user_role);

REVOKE EXECUTE ON FUNCTION public.admin_update_user_role(uuid, public.user_role, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(uuid, public.user_role, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_specialty(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_specialty(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_agents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agents() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(public.user_role, text, boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(public.user_role, text, boolean, integer, integer) TO authenticated;
