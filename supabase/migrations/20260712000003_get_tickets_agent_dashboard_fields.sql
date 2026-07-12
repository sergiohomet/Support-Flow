-- Migration: 20260712000003_get_tickets_agent_dashboard_fields
-- Purpose: Extend get_tickets() so the agent dashboard can filter for
--          unassigned tickets in the caller's category (p_only_unassigned),
--          filter for only-active tickets (p_active_only), and display
--          SLA escalation state (escalated_at, sla_hours) without a
--          separate round-trip per ticket.
--
-- CREATE OR REPLACE cannot change a function's parameter list or RETURNS
-- TABLE shape, so the function is dropped and recreated. The existing
-- visibility WHERE clause (admin sees all, client sees own, agent sees
-- own + category) and all existing filter semantics for p_status,
-- p_priority, p_category_id, and p_agent_id are preserved unchanged from
-- 20260703000008_specialty_to_category_fk.sql — only the two new params
-- and two new output columns are added.

DROP FUNCTION public.get_tickets(ticket_status, ticket_priority, uuid, uuid, integer, integer);

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

GRANT EXECUTE ON FUNCTION public.get_tickets(ticket_status, ticket_priority, uuid, uuid, integer, integer, boolean, boolean) TO authenticated;
