-- ============================================================
-- MIGRATION 20260701000005 — SLA dashboard RPCs
-- SupportFlow Helpdesk
--
-- Changes:
--   1. NEW admin_get_sla_dashboard(p_date_from, p_date_to) — totals for
--      total/resolved-in-SLA/escalated tickets in a date range, admin-only.
--   2. NEW admin_get_sla_compliance_by_category(p_date_from, p_date_to) —
--      per-category compliance breakdown, admin-only.
--   3. NEW admin_get_sla_at_risk_tickets(p_limit) — active tickets closest
--      to breaching their SLA deadline, admin-only.
--
-- Conventions followed (see 20260701000002):
--   - Admin-only via public.users role check (v_role IS DISTINCT FROM 'admin').
--   - ::text casts on every VARCHAR-sourced column selected into a
--     TEXT-declared RETURNS TABLE column.
--   - STABLE (read-only, no writes) + SECURITY DEFINER + SET search_path.
--
-- SLA deadline computation is always based on
-- COALESCE(t.sla_hours_snapshot, s.max_resolution_hours) — the frozen
-- snapshot taken at ticket-creation time (20260701000004), falling back
-- to the category's current max_resolution_hours only for legacy tickets
-- created before the snapshot column existed (sla_hours_snapshot IS NULL).
-- This guarantees historical tickets are never re-evaluated against a
-- live/edited SLA config, per design.
-- ============================================================

-- ============================================================
-- 1. admin_get_sla_dashboard
--    Admin-only. Aggregate counters over tickets created in the given
--    date range: total, resolved without ever escalating, and escalated.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_sla_dashboard(
  p_date_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '7 days'),
  p_date_to   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_tickets   BIGINT,
  resolved_in_sla BIGINT,
  escalated_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver el dashboard de SLA';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*) AS total_tickets,
    COUNT(*) FILTER (WHERE t.status = 'resuelto' AND t.escalated_at IS NULL) AS resolved_in_sla,
    COUNT(*) FILTER (WHERE t.escalated_at IS NOT NULL) AS escalated_count
  FROM public.tickets t
  WHERE t.created_at BETWEEN p_date_from AND p_date_to;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_sla_dashboard(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- ============================================================
-- 2. admin_get_sla_compliance_by_category
--    Admin-only. Per-category compliance percentage over tickets
--    created in the given date range. LEFT JOIN on tickets so
--    categories with zero tickets in range still appear (with NULL
--    compliance_pct via NULLIF-guarded division).
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_sla_compliance_by_category(
  p_date_from TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '7 days'),
  p_date_to   TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  category_id          UUID,
  category_name        TEXT,
  max_resolution_hours INTEGER,
  resolved_count       BIGINT,
  total_count          BIGINT,
  compliance_pct       NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver el dashboard de SLA';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    s.max_resolution_hours,
    COUNT(*) FILTER (WHERE t.status = 'resuelto' AND t.escalated_at IS NULL) AS resolved_count,
    COUNT(t.id) AS total_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE t.status = 'resuelto' AND t.escalated_at IS NULL)
        / NULLIF(COUNT(t.id), 0),
      0
    ) AS compliance_pct
  FROM public.categories c
  JOIN public.sla_config s ON s.category_id = c.id
  LEFT JOIN public.tickets t
    ON t.category_id = c.id
    AND t.created_at BETWEEN p_date_from AND p_date_to
  GROUP BY c.id, c.name, s.max_resolution_hours
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_sla_compliance_by_category(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;


-- ============================================================
-- 3. admin_get_sla_at_risk_tickets
--    Admin-only. Active (not resuelto, not yet escalated) tickets
--    whose category has escalation enabled, ordered by soonest SLA
--    deadline first (most negative/lowest minutes_remaining = most
--    at risk or already overdue but not yet processed by the cron).
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_sla_at_risk_tickets(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id                UUID,
  title             TEXT,
  category_name     TEXT,
  agent_full_name   TEXT,
  minutes_remaining INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver el dashboard de SLA';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.title::text,
    c.name::text AS category_name,
    COALESCE(agent_u.full_name::text, 'Sin asignar') AS agent_full_name,
    (EXTRACT(EPOCH FROM (
      t.created_at + make_interval(hours => COALESCE(t.sla_hours_snapshot, s.max_resolution_hours))
      - NOW()
    )) / 60)::INTEGER AS minutes_remaining
  FROM public.tickets t
  JOIN public.categories c ON c.id = t.category_id
  JOIN public.sla_config s ON s.category_id = c.id
  LEFT JOIN public.users agent_u ON agent_u.id = t.agent_id
  WHERE t.status <> 'resuelto'
    AND t.escalated_at IS NULL
    AND s.escalation_enabled = true
  ORDER BY minutes_remaining ASC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_sla_at_risk_tickets(INTEGER) TO authenticated;
