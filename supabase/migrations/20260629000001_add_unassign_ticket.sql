-- ============================================================
-- MIGRATION 20260629000001 — unassign_ticket RPC
-- SupportFlow Helpdesk
--
-- assign_ticket does NOT accept NULL for p_agent_id (by design,
-- to keep the trigger logic clean). This dedicated RPC handles
-- the "return to pool" case: sets agent_id = NULL and resets
-- status to 'abierto' so the ticket reappears in the unassigned queue.
--
-- Security: agent or admin only (same as assign_ticket).
-- The status change fires the log_ticket_status_change trigger
-- automatically — no manual insert needed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.unassign_ticket(
  p_ticket_id UUID
)
RETURNS TABLE (
  id         UUID,
  agent_id   UUID,
  status     public.ticket_status,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT raw_user_meta_data->>'role'
  INTO v_role
  FROM auth.users
  WHERE auth.users.id = auth.uid();

  IF v_role NOT IN ('agent', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: only agents and admins can unassign tickets';
  END IF;

  RETURN QUERY
  UPDATE tickets
  SET
    agent_id   = NULL,
    status     = 'abierto',
    updated_at = NOW()
  WHERE tickets.id = p_ticket_id
  RETURNING tickets.id, tickets.agent_id, tickets.status, tickets.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unassign_ticket(UUID) TO authenticated;
