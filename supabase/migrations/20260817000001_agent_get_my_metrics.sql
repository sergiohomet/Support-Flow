-- Migration: 20260817000001_agent_get_my_metrics
-- Purpose: Agent-scoped metrics RPC for the agent dashboard summary cards.
--          Follows the same pattern as admin_get_reports_agent_performance
--          but scoped to a single agent (p_agent_id).

CREATE OR REPLACE FUNCTION public.agent_get_my_metrics(p_agent_id uuid)
RETURNS TABLE (
  assigned_count      bigint,
  resolved_this_month bigint,
  sla_compliance_pct  numeric,
  avg_resolution_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH active_tickets AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM public.tickets t
    WHERE t.agent_id = p_agent_id
      AND t.status IN ('abierto', 'en_proceso', 'reabierto')
  ),
  resolved_this_month AS (
    SELECT COUNT(*)::bigint AS cnt
    FROM public.tickets t
    JOIN public.ticket_status_log tsl
      ON tsl.ticket_id = t.id
    WHERE t.agent_id = p_agent_id
      AND tsl.to_status = 'resuelto'
      AND tsl.changed_at >= date_trunc('month', now())
  ),
  resolved_tickets AS (
    SELECT
      t.id,
      t.escalated_at,
      tsl.changed_at AS resolved_at,
      t.created_at
    FROM public.tickets t
    JOIN public.ticket_status_log tsl
      ON tsl.ticket_id = t.id
    WHERE t.agent_id = p_agent_id
      AND tsl.to_status = 'resuelto'
      AND tsl.changed_at >= date_trunc('month', now())
  )
  SELECT
    at.cnt,
    rm.cnt,
    ROUND(
      100.0 * COUNT(CASE WHEN rt.escalated_at IS NULL THEN 1 END)
        / NULLIF(COUNT(*), 0),
      2
    ),
    ROUND(
      AVG(EXTRACT(EPOCH FROM (rt.resolved_at - rt.created_at)) / 3600.0),
      1
    )
  FROM active_tickets at
  CROSS JOIN resolved_this_month rm
  LEFT JOIN resolved_tickets rt ON true
  GROUP BY at.cnt, rm.cnt;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.agent_get_my_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agent_get_my_metrics(uuid) TO authenticated;
