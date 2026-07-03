-- ============================================================
-- MIGRATION 20260703000006 — admin_update_user_specialty RPC
-- SupportFlow Helpdesk
--
-- Closes backlog item 1: specialty could only be set at user
-- creation time, with no way to edit an existing user's specialty
-- afterward. No self-restriction (unlike role/active-status): unlike
-- those, specialty carries no security implications.
-- ============================================================

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
BEGIN
  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Only admins can update user specialty';
  END IF;

  UPDATE public.users
  SET specialty = NULLIF(TRIM(p_specialty), '')
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: User not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_specialty(UUID, TEXT) TO authenticated;
