-- ============================================================
-- MIGRATION 20260708000001 — Reports & Statistics RPCs
-- SupportFlow Helpdesk
--
-- Closes RF-12/RF-14/UC-16: admin-only "Reportes y Estadísticas"
-- dashboard. 4 self-contained RPCs (module-island convention — no
-- calls into the sla module's RPCs), no new tables/columns.
--
-- Two distinct SLA-compliance formulas exist in this project on
-- purpose: admin_get_sla_dashboard's is resolved_in_sla/TOTAL tickets
-- in range (includes still-open tickets). These reports RPCs use
-- resolved_in_sla/RESOLVED tickets instead — a deliberate departure,
-- confirmed with the user, so this dashboard's KPI is genuinely
-- distinct data from the SLA dashboard, not the same number restyled.
-- ============================================================

-- ── admin_get_reports_summary ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_reports_summary(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  total_tickets        BIGINT,
  avg_resolution_hours NUMERIC,
  sla_compliance_pct   NUMERIC,
  escalated_count      BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver los reportes';
  END IF;

  RETURN QUERY
  WITH scoped_tickets AS (
    SELECT t.*
    FROM public.tickets t
    WHERE t.created_at BETWEEN p_date_from AND p_date_to
  ),
  resolution_times AS (
    SELECT
      st.id,
      EXTRACT(EPOCH FROM (latest_resuelto.changed_at - st.created_at)) / 3600.0 AS resolution_hours
    FROM scoped_tickets st
    JOIN LATERAL (
      SELECT l.changed_at
      FROM public.ticket_status_log l
      WHERE l.ticket_id = st.id AND l.to_status = 'resuelto'
      ORDER BY l.changed_at DESC
      LIMIT 1
    ) latest_resuelto ON true
    WHERE st.status = 'resuelto'
  )
  SELECT
    COUNT(*) AS total_tickets,
    (SELECT AVG(rt.resolution_hours) FROM resolution_times rt) AS avg_resolution_hours,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE st.status = 'resuelto' AND st.escalated_at IS NULL)
        / NULLIF(COUNT(*) FILTER (WHERE st.status = 'resuelto'), 0),
      2
    ) AS sla_compliance_pct,
    COUNT(*) FILTER (WHERE st.escalated_at IS NOT NULL) AS escalated_count
  FROM scoped_tickets st;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_reports_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_reports_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ── admin_get_reports_tickets_by_category ───────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_reports_tickets_by_category(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  category_id   UUID,
  category_name TEXT,
  ticket_count  BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver los reportes';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    COUNT(t.id) AS ticket_count
  FROM public.categories c
  LEFT JOIN public.tickets t
    ON t.category_id = c.id
    AND t.created_at BETWEEN p_date_from AND p_date_to
  GROUP BY c.id, c.name
  ORDER BY c.name ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_reports_tickets_by_category(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_reports_tickets_by_category(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ── admin_get_reports_tickets_by_week ────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_reports_tickets_by_week(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  week_start   TIMESTAMPTZ,
  ticket_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver los reportes';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('week', t.created_at) AS week_start,
    COUNT(*) AS ticket_count
  FROM public.tickets t
  WHERE t.created_at BETWEEN p_date_from AND p_date_to
  GROUP BY date_trunc('week', t.created_at)
  ORDER BY week_start ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_reports_tickets_by_week(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_reports_tickets_by_week(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ── admin_get_reports_agent_performance ──────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_get_reports_agent_performance(
  p_date_from TIMESTAMPTZ,
  p_date_to   TIMESTAMPTZ
)
RETURNS TABLE (
  agent_id           UUID,
  agent_full_name    TEXT,
  resolved_count     BIGINT,
  avg_working_hours  NUMERIC,
  sla_compliance_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver los reportes';
  END IF;

  RETURN QUERY
  WITH resolved_tickets AS (
    SELECT
      t.id,
      t.agent_id,
      t.escalated_at,
      latest_resuelto.changed_at AS resuelto_at
    FROM public.tickets t
    JOIN LATERAL (
      SELECT l.changed_at
      FROM public.ticket_status_log l
      WHERE l.ticket_id = t.id AND l.to_status = 'resuelto'
      ORDER BY l.changed_at DESC
      LIMIT 1
    ) latest_resuelto ON true
    WHERE t.status = 'resuelto'
      AND t.created_at BETWEEN p_date_from AND p_date_to
      AND t.agent_id IS NOT NULL
  ),
  working_hours AS (
    SELECT
      rt.id,
      rt.agent_id,
      EXTRACT(EPOCH FROM (rt.resuelto_at - latest_assignment.changed_at)) / 3600.0 AS working_hours
    FROM resolved_tickets rt
    JOIN LATERAL (
      SELECT al.changed_at
      FROM public.ticket_assignment_log al
      WHERE al.ticket_id = rt.id AND al.to_agent_id = rt.agent_id
      ORDER BY al.changed_at DESC
      LIMIT 1
    ) latest_assignment ON true
  )
  SELECT
    u.id AS agent_id,
    u.full_name::text AS agent_full_name,
    COUNT(rt.id) AS resolved_count,
    (SELECT AVG(wh.working_hours) FROM working_hours wh WHERE wh.agent_id = u.id) AS avg_working_hours,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE rt.escalated_at IS NULL)
        / NULLIF(COUNT(rt.id), 0),
      2
    ) AS sla_compliance_pct
  FROM public.users u
  JOIN resolved_tickets rt ON rt.agent_id = u.id
  WHERE u.role = 'agent'
  GROUP BY u.id, u.full_name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_reports_agent_performance(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_reports_agent_performance(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
