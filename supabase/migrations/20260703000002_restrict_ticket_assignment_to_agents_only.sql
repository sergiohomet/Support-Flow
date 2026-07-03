-- ============================================================
-- MIGRATION 20260703000002 — Restrict ticket assignment to agents only
-- SupportFlow Helpdesk
--
-- Business rule (user, 2026-07-03): admins are not meant to resolve
-- tickets — only agents should be assignable. Previously both
-- get_agents() and the validate_agent_role trigger allowed 'agent' OR
-- 'admin' as a valid agent_id target, so admins showed up in the
-- reassignment dropdown and could even be assigned to themselves.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_agent_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    SELECT role INTO v_role FROM public.users WHERE id = NEW.agent_id;
    IF v_role != 'agent' THEN
      RAISE EXCEPTION 'invalid_agent_role: El usuario asignado debe tener rol agent';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_agents()
RETURNS TABLE (
  id                  UUID,
  full_name           TEXT,
  specialty           TEXT,
  active_ticket_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name::TEXT,
    u.specialty::TEXT,
    (
      SELECT COUNT(*)
      FROM public.tickets t
      WHERE t.agent_id = u.id
        AND t.status IN ('abierto', 'en_proceso', 'reabierto')
    ) AS active_ticket_count
  FROM public.users u
  WHERE u.role = 'agent'
    AND u.is_active = TRUE
  ORDER BY u.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agents() TO authenticated;
