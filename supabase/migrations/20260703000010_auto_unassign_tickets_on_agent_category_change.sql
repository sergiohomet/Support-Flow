-- ============================================================
-- MIGRATION 20260703000010 — Auto-unassign tickets on agent category change
-- SupportFlow Helpdesk
--
-- When an agent's category changes (or they stop being an agent), any
-- ticket still assigned to them that no longer matches their category
-- is automatically unassigned (agent_id = NULL, status = 'abierto',
-- mirroring unassign_ticket()'s behavior) so another agent can pick it
-- up. Already-resolved tickets are left untouched — there is nothing
-- for another agent to pick up.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id     UUID,
  p_new_role    public.user_role,
  p_category_id UUID DEFAULT NULL
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

  IF p_new_role = 'agent' AND p_category_id IS NULL THEN
    RAISE EXCEPTION 'category_required: Debe especificar una categoría al asignar el rol agent';
  END IF;

  UPDATE public.users
  SET role = p_new_role,
      category_id = CASE WHEN p_new_role = 'agent' THEN p_category_id ELSE NULL END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: User not found';
  END IF;

  -- Auto-unassign this agent's active tickets that no longer match their
  -- (new or absent) category, so another agent can pick them up.
  UPDATE public.tickets
  SET agent_id   = NULL,
      status     = 'abierto',
      updated_at = now()
  WHERE agent_id = p_user_id
    AND status != 'resuelto'
    AND (p_new_role != 'agent' OR category_id != p_category_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_specialty(
  p_user_id     UUID,
  p_category_id UUID
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

  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'category_required: La especialidad es obligatoria para agentes';
  END IF;

  UPDATE public.users
  SET category_id = p_category_id
  WHERE id = p_user_id;

  -- Auto-unassign this agent's active tickets that no longer match their
  -- new category, so another agent can pick them up.
  UPDATE public.tickets
  SET agent_id   = NULL,
      status     = 'abierto',
      updated_at = now()
  WHERE agent_id = p_user_id
    AND status != 'resuelto'
    AND category_id != p_category_id;
END;
$$;
