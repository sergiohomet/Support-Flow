-- ============================================================
-- MIGRATION 20260714000006 — create_ticket notification fan-out +
-- has_unread_notifications() RPC
-- SupportFlow Helpdesk
--
-- PR2 of the "realtime" change. Restructures create_ticket from a
-- single `RETURN QUERY INSERT ... RETURNING` statement into
-- `INSERT ... RETURNING ... INTO` variables, so two more INSERT
-- statements (the notification fan-out) can run afterward in the same
-- transaction before the final RETURN QUERY. The IS DISTINCT FROM
-- 'client' auth check (fixed 2026-07-14 in the security-hardening
-- migration) is preserved verbatim.
--
-- Fan-out: one notifications row per active agent whose category
-- matches the new ticket, one row per active admin. Both are plain
-- INSERT ... SELECT — zero matching rows inserts zero rows, it is not
-- an error, so ticket creation always succeeds regardless of how many
-- (if any) recipients exist. No self-exclusion needed: create_ticket
-- only permits role='client' callers, who can never match either
-- recipient set.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_ticket(p_title text, p_description text, p_category_id uuid, p_priority ticket_priority DEFAULT 'media'::ticket_priority)
 RETURNS TABLE(id uuid, title text, status ticket_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_id uuid;
  v_title text;
  v_status ticket_status;
  v_created_at timestamptz;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'client' THEN
    RAISE EXCEPTION 'unauthorized: Solo los clientes pueden crear tickets';
  END IF;

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
    tickets.created_at
  INTO v_id, v_title, v_status, v_created_at;

  -- Notify active agents whose category matches the new ticket. Zero
  -- matching rows is not an error — it just inserts nothing.
  INSERT INTO public.notifications (user_id, ticket_id, type, message)
  SELECT u.id, v_id, 'new_ticket', 'Nuevo ticket en tu categoría: "' || v_title || '".'
  FROM public.users u
  WHERE u.role = 'agent' AND u.category_id = p_category_id AND u.is_active = true;

  -- Notify active admins.
  INSERT INTO public.notifications (user_id, ticket_id, type, message)
  SELECT u.id, v_id, 'new_ticket', 'Se creó un nuevo ticket: "' || v_title || '".'
  FROM public.users u
  WHERE u.role = 'admin' AND u.is_active = true;

  RETURN QUERY SELECT v_id, v_title, v_status, v_created_at;
END;
$function$;


-- ── has_unread_notifications(): cheap boolean for the sidebar badge ─────
-- Narrow single-purpose RPC (same convention as get_ticket_comments,
-- get_agents) rather than reusing get_notifications('unread') and
-- checking array length — fetching full rows just to answer "any
-- exist" is the wrong payload shape for a persistent-layout indicator.

CREATE OR REPLACE FUNCTION public.has_unread_notifications()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = auth.uid() AND is_read = false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_unread_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_unread_notifications() TO authenticated;
