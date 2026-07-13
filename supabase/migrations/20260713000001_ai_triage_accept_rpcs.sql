-- ============================================================
-- MIGRATION 20260713000001 — AI Triage Accept RPCs
-- SupportFlow Helpdesk
--
-- PR1 of the "ai-triage" change (DB foundation only). Adds two
-- narrow-scope RPCs that let an agent/admin accept an AI-suggested
-- category or priority for a ticket, one field at a time.
--
-- Design constraints:
--   1. accept_ai_triage_category touches ONLY tickets.category_id.
--   2. accept_ai_triage_priority touches ONLY tickets.priority.
--      Neither function reads or writes tickets.ai_triage or any
--      other column — callers must remain fully independent so
--      accepting one suggestion never affects the other.
--   3. Role gate mirrors the rest of the ticket RPCs: agent/admin
--      only, via public.get_my_role(), NULL-safe using
--      IS DISTINCT FROM (never !=/NOT IN — those are not NULL-safe
--      and would silently let an unauthenticated/roleless caller
--      through).
--   4. REVOKE EXECUTE FROM PUBLIC before GRANT TO authenticated for
--      both functions — standing project convention since Postgres
--      defaults new functions to PUBLIC-executable (which extends
--      to the anon role via PostgREST).
-- ============================================================

-- ============================================================
-- 1. accept_ai_triage_category
--    Agent/admin only. Updates tickets.category_id only.
--    Raises not_found if the category or the ticket doesn't exist.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_ai_triage_category(
  p_ticket_id   UUID,
  p_category_id UUID
)
RETURNS TABLE (
  id          UUID,
  category_id UUID,
  updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();

  IF v_role IS DISTINCT FROM 'agent' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden aceptar la categoría sugerida por la IA';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.id = p_category_id) THEN
    RAISE EXCEPTION 'not_found: La categoría especificada no existe';
  END IF;

  RETURN QUERY
  UPDATE public.tickets t
  SET category_id = p_category_id
  WHERE t.id = p_ticket_id
  RETURNING
    t.id,
    t.category_id,
    t.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Ticket no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_ai_triage_category(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_ai_triage_category(UUID, UUID) TO authenticated;


-- ============================================================
-- 2. accept_ai_triage_priority
--    Agent/admin only. Updates tickets.priority only.
--    Invalid enum values are rejected by Postgres at the parameter
--    binding level before the function body ever runs, so no
--    extra validation is needed here beyond the role gate.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_ai_triage_priority(
  p_ticket_id UUID,
  p_priority  public.ticket_priority
)
RETURNS TABLE (
  id         UUID,
  priority   public.ticket_priority,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();

  IF v_role IS DISTINCT FROM 'agent' AND v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden aceptar la prioridad sugerida por la IA';
  END IF;

  RETURN QUERY
  UPDATE public.tickets t
  SET priority = p_priority
  WHERE t.id = p_ticket_id
  RETURNING
    t.id,
    t.priority,
    t.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Ticket no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_ai_triage_priority(UUID, public.ticket_priority) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_ai_triage_priority(UUID, public.ticket_priority) TO authenticated;
