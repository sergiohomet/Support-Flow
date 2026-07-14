-- ============================================================
-- MIGRATION 20260714000002 — ai_triage dismiss RPC
-- SupportFlow Helpdesk
--
-- Follow-up to the ai-triage change. The "Sugerencias IA" suggestion is
-- generated once, for the ticket's original description — it's not
-- re-triaged as new comments come in, so once the agent has acted on it
-- (ignored it, or sent a reply based on it) it should never reappear,
-- not even after a page reload. Adds accept_ai_triage_dismiss(), mirroring
-- accept_ai_triage_category/priority's role-gate and REVOKE/GRANT
-- discipline exactly (see 20260713000001_ai_triage_accept_rpcs.sql).
--
-- Implementation: simply sets ai_triage back to NULL. The existing
-- frontend render-gate ("show the panel only when ai_triage is non-null")
-- already means this is enough to make the panel disappear permanently —
-- no new column or flag needed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.dismiss_ai_triage(
  p_ticket_id UUID
)
RETURNS TABLE (
  id         UUID,
  ai_triage  JSONB,
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
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden descartar la sugerencia de la IA';
  END IF;

  RETURN QUERY
  UPDATE public.tickets t
  SET ai_triage = NULL
  WHERE t.id = p_ticket_id
  RETURNING
    t.id,
    t.ai_triage,
    t.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Ticket no encontrado';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.dismiss_ai_triage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dismiss_ai_triage(UUID) TO authenticated;
