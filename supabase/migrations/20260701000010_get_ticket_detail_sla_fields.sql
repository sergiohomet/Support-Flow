-- ============================================================
-- MIGRATION 20260701000010 — expose real SLA fields on ticket detail
-- SupportFlow Helpdesk
--
-- get_ticket_detail previously returned no SLA information at all,
-- so TicketDetailPage rendered a hardcoded "SLA Resolución" block:
-- always "Resuelto dentro del SLA" for resolved tickets (even ones
-- that had actually breached and been escalated before resolution —
-- a false positive) and always "No configurado" for everything else,
-- regardless of the ticket's real escalation state or deadline.
--
-- Adds:
--   - escalated_at: passthrough of tickets.escalated_at.
--   - sla_hours: COALESCE(tickets.sla_hours_snapshot,
--     sla_config.max_resolution_hours) — the effective SLA hours for
--     this ticket, snapshot-based per the rest of the SLA feature,
--     with the same legacy-ticket fallback used everywhere else.
--
-- created_at (already returned) + sla_hours is enough for the
-- frontend to compute a real deadline/countdown, matching how
-- admin_get_sla_at_risk_tickets already does the same math.
--
-- Postgres does not allow CREATE OR REPLACE to change a function's
-- RETURNS TABLE column list, so this requires DROP + CREATE (same
-- signature/args, only the return shape changes) and the GRANT must
-- be re-applied after DROP.
-- ============================================================

DROP FUNCTION public.get_ticket_detail(uuid);

CREATE FUNCTION public.get_ticket_detail(
  p_ticket_id UUID
)
RETURNS TABLE (
  id                 UUID,
  title              TEXT,
  description        TEXT,
  status             public.ticket_status,
  priority           public.ticket_priority,
  category_id        UUID,
  category_name      TEXT,
  category_is_active BOOLEAN,
  client_id          UUID,
  client_full_name   TEXT,
  agent_id           UUID,
  agent_full_name    TEXT,
  ai_triage          JSONB,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  escalated_at       TIMESTAMPTZ,
  sla_hours          INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();

  RETURN QUERY
  SELECT
    t.id,
    t.title::text,
    t.description,
    t.status,
    t.priority,
    t.category_id,
    c.name::text             AS category_name,
    c.is_active              AS category_is_active,
    t.client_id,
    client_u.full_name::text AS client_full_name,
    t.agent_id,
    agent_u.full_name::text  AS agent_full_name,
    t.ai_triage,
    t.created_at,
    t.updated_at,
    t.escalated_at,
    COALESCE(t.sla_hours_snapshot, s.max_resolution_hours) AS sla_hours
  FROM public.tickets t
  JOIN public.categories c    ON c.id = t.category_id
  JOIN public.users client_u  ON client_u.id = t.client_id
  LEFT JOIN public.users agent_u ON agent_u.id = t.agent_id
  LEFT JOIN public.sla_config s  ON s.category_id = t.category_id
  WHERE t.id = p_ticket_id
    AND (
      v_role IN ('agent', 'admin')
      OR t.client_id = auth.uid()
      OR t.agent_id  = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_detail(UUID) TO authenticated;
