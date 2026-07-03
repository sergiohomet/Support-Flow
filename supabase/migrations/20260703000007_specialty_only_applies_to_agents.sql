-- ============================================================
-- MIGRATION 20260703000007 — Specialty only applies to agents
-- SupportFlow Helpdesk
--
-- Business rule: specialty is meaningless for non-agent roles.
-- - admin_update_user_role now clears specialty whenever a user's
--   role changes to anything other than 'agent'.
-- - admin_update_user_specialty now rejects setting a specialty on
--   a user whose role isn't 'agent'.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id  UUID,
  p_new_role public.user_role
)
RETURNS void
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
    RAISE EXCEPTION 'unauthorized: Only admins can update user roles';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: Cannot change your own role';
  END IF;

  UPDATE public.users
  SET role = p_new_role,
      specialty = CASE WHEN p_new_role != 'agent' THEN NULL ELSE specialty END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: User not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_specialty(
  p_user_id   UUID,
  p_specialty TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_target_role public.user_role;
BEGIN
  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Only admins can update user specialty';
  END IF;

  SELECT u.role INTO v_target_role
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: User not found';
  END IF;

  IF v_target_role != 'agent' THEN
    RAISE EXCEPTION 'invalid_role: La especialidad solo aplica a usuarios con rol agent';
  END IF;

  UPDATE public.users
  SET specialty = NULLIF(TRIM(p_specialty), '')
  WHERE id = p_user_id;
END;
$$;
