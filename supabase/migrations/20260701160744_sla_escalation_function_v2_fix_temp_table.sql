-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.
-- Fixes an earlier draft that used CREATE TEMP TABLE ... ON COMMIT DROP.

CREATE OR REPLACE FUNCTION public.run_sla_escalation_check()
RETURNS TABLE (
  escalated_ticket_id UUID,
  escalated_count     BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_admin  RECORD;
  v_ids    UUID[] := '{}';
BEGIN
  FOR v_ticket IN
    UPDATE public.tickets AS t
    SET escalated_at = NOW(),
        priority     = 'critica'
    FROM public.sla_config AS s
    WHERE s.category_id = t.category_id
      AND t.status <> 'resuelto'
      AND t.escalated_at IS NULL
      AND s.escalation_enabled = true
      AND t.created_at + make_interval(hours => COALESCE(t.sla_hours_snapshot, s.max_resolution_hours)) < NOW()
    RETURNING t.id, t.title
  LOOP
    v_ids := array_append(v_ids, v_ticket.id);

    FOR v_admin IN
      SELECT u.id FROM public.users u
      WHERE u.role = 'admin' AND u.is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, ticket_id, type, message)
      VALUES (
        v_admin.id,
        v_ticket.id,
        'sla_escalation',
        'El ticket "' || v_ticket.title || '" superó su SLA y fue escalado.'
      );
    END LOOP;
  END LOOP;

  RETURN QUERY
  SELECT unnest(v_ids), array_length(v_ids, 1)::BIGINT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_sla_escalation_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_sla_escalation_check() TO service_role;
