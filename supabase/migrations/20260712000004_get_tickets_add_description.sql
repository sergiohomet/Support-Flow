-- Migration: 20260712000004_get_tickets_add_description
-- Purpose: Add `description` to get_tickets()'s return columns so list
--          views that need a short snippet (e.g. the agent dashboard's
--          "Tickets Disponibles" cards, per the Stitch mockup) don't need
--          a second round-trip to get_ticket_detail() per ticket.
--
-- CREATE OR REPLACE cannot change a function's RETURNS TABLE shape, so the
-- function is dropped and recreated. The existing visibility WHERE clause,
-- all existing filter semantics (p_status, p_priority, p_category_id,
-- p_agent_id, p_only_unassigned, p_active_only), and all other output
-- columns are preserved unchanged from 20260712000003_get_tickets_agent_dashboard_fields.sql
-- — only `description` is added.
--
-- description is a short-to-medium free-text field (client-authored ticket
-- description), not a large blob — adding it to a paginated list RPC (10-50
-- rows per page) is a negligible payload cost. This is a deliberate,
-- narrow addition, not a shift away from the list/detail RPC separation
-- convention: get_ticket_detail() remains the only place ai_triage (a JSON
-- blob) and any other detail-only field are returned.

DROP FUNCTION public.get_tickets(ticket_status, ticket_priority, uuid, uuid, integer, integer, boolean, boolean);

CREATE FUNCTION public.get_tickets(
  p_status          ticket_status DEFAULT NULL::ticket_status,
  p_priority        ticket_priority DEFAULT NULL::ticket_priority,
  p_category_id     uuid DEFAULT NULL::uuid,
  p_agent_id        uuid DEFAULT NULL::uuid,
  p_page            integer DEFAULT 1,
  p_page_size       integer DEFAULT 10,
  p_only_unassigned boolean DEFAULT false,
  p_active_only     boolean DEFAULT false
)
RETURNS TABLE(
  id                 uuid,
  title              text,
  description        text,
  status             ticket_status,
  priority           ticket_priority,
  category_id        uuid,
  category_name      text,
  category_is_active boolean,
  client_id          uuid,
  client_full_name   text,
  agent_id           uuid,
  agent_full_name    text,
  created_at         timestamptz,
  updated_at         timestamptz,
  comment_count      bigint,
  escalated_at       timestamptz,
  sla_hours          integer,
  total_count        bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_role            public.user_role;
  v_caller_category UUID;
BEGIN
  v_role := public.get_my_role();

  IF v_role = 'agent' THEN
    SELECT u.category_id INTO v_caller_category FROM public.users u WHERE u.id = auth.uid();
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title::text,
    t.description::text,
    t.status,
    t.priority,
    t.category_id,
    c.name::text             AS category_name,
    c.is_active              AS category_is_active,
    t.client_id,
    client_u.full_name::text AS client_full_name,
    t.agent_id,
    agent_u.full_name::text  AS agent_full_name,
    t.created_at,
    t.updated_at,
    (
      SELECT COUNT(*)
      FROM public.ticket_comments tc
      WHERE tc.ticket_id = t.id
    )                        AS comment_count,
    t.escalated_at,
    COALESCE(t.sla_hours_snapshot, s.max_resolution_hours) AS sla_hours,
    COUNT(*) OVER()          AS total_count
  FROM public.tickets t
  JOIN public.categories c    ON c.id = t.category_id
  JOIN public.users client_u  ON client_u.id = t.client_id
  LEFT JOIN public.users agent_u ON agent_u.id = t.agent_id
  LEFT JOIN public.sla_config s ON s.category_id = t.category_id
  WHERE
    (
      v_role = 'admin'
      OR t.client_id = auth.uid()
      OR (v_role = 'agent' AND (t.agent_id = auth.uid() OR t.category_id = v_caller_category))
    )
    AND (p_status          IS NULL OR t.status      = p_status)
    AND (p_priority        IS NULL OR t.priority    = p_priority)
    AND (p_category_id     IS NULL OR t.category_id = p_category_id)
    AND (p_agent_id        IS NULL OR t.agent_id IS NOT DISTINCT FROM p_agent_id)
    AND (NOT p_only_unassigned OR t.agent_id IS NULL)
    AND (NOT p_active_only     OR t.status IN ('abierto', 'en_proceso', 'reabierto'))
  ORDER BY t.created_at DESC
  OFFSET (p_page - 1) * p_page_size
  LIMIT  p_page_size;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_tickets(ticket_status, ticket_priority, uuid, uuid, integer, integer, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tickets(ticket_status, ticket_priority, uuid, uuid, integer, integer, boolean, boolean) TO authenticated;
