-- ============================================================
-- MIGRATION 20260701000006 — SLA escalation function
-- SupportFlow Helpdesk
--
-- NEW run_sla_escalation_check() — finds active tickets that have
-- breached their SLA deadline and escalates them: sets escalated_at,
-- forces priority to 'critica', and notifies every active admin.
--
-- This function is intentionally NOT granted to `authenticated`. It is
-- meant to be invoked only by the service-role client from the future
-- Edge Function (Slice 3 — cron-triggered), never by end users, so it
-- has no admin role-check (there is no "calling user" in that context).
--
-- Eligibility per ticket:
--   - status <> 'resuelto'            (reabierto stays eligible — a
--                                       reopened ticket is active again)
--   - escalated_at IS NULL            (not already escalated)
--   - sla_config.escalation_enabled   (read live, not snapshotted —
--     = true                          admins can turn escalation off
--                                       for a category at any time)
--   - elapsed time since created_at exceeds
--     COALESCE(sla_hours_snapshot, sla_config.max_resolution_hours)
--
-- Idempotency / concurrency: the UPDATE's WHERE escalated_at IS NULL
-- clause is the guard. Postgres row-locks matched rows for the
-- duration of the UPDATE, so two concurrent invocations cannot both
-- escalate (and double-notify) the same ticket — the second call's
-- WHERE clause simply matches zero rows for tickets the first call
-- already updated. No advisory lock needed.
--
-- Design: a single FOR loop iterates directly over an
-- UPDATE ... RETURNING query (no intermediate temp table — an earlier
-- draft used `CREATE TEMP TABLE ... ON COMMIT DROP`, but that only
-- drops the table at transaction COMMIT, so a second call to this
-- function within the same still-open transaction would fail with
-- "relation already exists". Looping directly over UPDATE ... RETURNING
-- avoids any session-scoped state and works correctly regardless of
-- transaction boundaries between calls). For each escalated ticket, we
-- loop over active admins to insert one sla_escalation notification
-- per admin per ticket, and accumulate escalated ids into an array to
-- report back the total count.
-- ============================================================

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

-- SECURITY: Postgres grants EXECUTE to PUBLIC by default on every new
-- function. This function has no admin role-check (by design — it has
-- no "calling user" when invoked by the cron's service-role client), so
-- leaving the default PUBLIC grant in place would let ANY authenticated
-- (or anon) caller force-escalate arbitrary tickets via the REST RPC
-- endpoint. Explicitly revoke PUBLIC access and grant only to
-- service_role, the sole intended caller (Slice 3's Edge Function).
REVOKE EXECUTE ON FUNCTION public.run_sla_escalation_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_sla_escalation_check() TO service_role;
