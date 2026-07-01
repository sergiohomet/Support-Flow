-- ============================================================
-- MIGRATION 20260701000004 — SLA hours snapshot on ticket create
-- SupportFlow Helpdesk
--
-- Populates the new tickets.sla_hours_snapshot column (added in
-- 20260701000001) at INSERT time, copying sla_config's current
-- max_resolution_hours for the ticket's category. This snapshot is
-- intentionally frozen: later admin edits to sla_config must NOT
-- retroactively change the SLA deadline of already-created tickets.
--
-- escalated_at is left NULL (its column default) — populating it is
-- out of scope for this slice (escalation cron, later slice).
--
-- RETURNS TABLE signature is unchanged (id, title, status,
-- created_at) — existing callers depend on this exact shape, so no
-- new output columns are added here.
--
-- CREATE OR REPLACE preserves the exact body from
-- 20260630000003 (last fix — added ::text cast on title), only
-- adding the sla_hours_snapshot column to the INSERT.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_ticket(
  p_title       TEXT,
  p_description TEXT,
  p_category_id UUID,
  p_priority    public.ticket_priority DEFAULT 'media'
)
RETURNS TABLE (
  id         UUID,
  title      TEXT,
  status     public.ticket_status,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_my_role() != 'client' THEN
    RAISE EXCEPTION 'unauthorized: Solo los clientes pueden crear tickets';
  END IF;

  RETURN QUERY
  INSERT INTO public.tickets (
    title, description, category_id, priority, client_id, status, agent_id,
    sla_hours_snapshot
  )
  VALUES (
    p_title, p_description, p_category_id, p_priority, auth.uid(), 'abierto', NULL,
    (SELECT s.max_resolution_hours FROM public.sla_config s WHERE s.category_id = p_category_id)
  )
  RETURNING
    tickets.id,
    tickets.title::text,
    tickets.status,
    tickets.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ticket(TEXT, TEXT, UUID, public.ticket_priority) TO authenticated;
