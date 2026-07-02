-- ============================================================
-- MIGRATION 20260702000002 — Notifications: producer wiring + new RPCs
-- SupportFlow Helpdesk
--
-- Wires notification INSERTs into 3 existing RPCs and creates the
-- 3 new RPCs the frontend module consumes. Applied as
-- 20260702174401_notifications_producers and
-- 20260702174548_notifications_revoke_public_grants on the live DB;
-- combined here into one file since they're one coherent unit.
--
-- Function bodies below were re-verified against pg_get_functiondef()
-- on the live DB immediately before writing this migration, NOT
-- copied from the (potentially stale) prior migration files — see
-- add_ticket_comment's resolved-ticket guard clause below, which
-- exists live via an undocumented migration
-- (block_comments_on_resolved_tickets) not present anywhere in this
-- repo's migration history. Reproduced verbatim here to avoid
-- silently dropping it.
-- ============================================================

-- ============================================================
-- update_ticket_status: add status_change notification producer
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_ticket_status(
  p_ticket_id  UUID,
  p_new_status public.ticket_status
)
RETURNS TABLE (
  id         UUID,
  status     public.ticket_status,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role           public.user_role;
  v_current_status public.ticket_status;
  v_client_id      UUID;
  v_agent_id       UUID;
  v_valid          BOOLEAN := FALSE;
BEGIN
  v_role := public.get_my_role();

  SELECT t.status, t.client_id, t.agent_id
  INTO   v_current_status, v_client_id, v_agent_id
  FROM   public.tickets t
  WHERE  t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Ticket no encontrado';
  END IF;

  IF v_role = 'client' THEN
    IF v_client_id != auth.uid() THEN
      RAISE EXCEPTION 'unauthorized: No tenés permiso para modificar este ticket';
    END IF;

    IF NOT (v_current_status = 'resuelto' AND p_new_status = 'reabierto') THEN
      RAISE EXCEPTION 'invalid_transition: Los clientes solo pueden reabrir tickets resueltos';
    END IF;

  ELSE
    IF v_current_status = 'abierto' THEN
      v_valid := p_new_status IN ('en_proceso', 'resuelto');
    ELSIF v_current_status = 'en_proceso' THEN
      v_valid := p_new_status IN ('resuelto', 'abierto');
    ELSIF v_current_status = 'resuelto' THEN
      v_valid := p_new_status = 'reabierto';
    ELSIF v_current_status = 'reabierto' THEN
      v_valid := p_new_status IN ('en_proceso', 'resuelto');
    END IF;

    IF NOT v_valid THEN
      RAISE EXCEPTION 'invalid_transition: Transición % → % no permitida',
        v_current_status, p_new_status;
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.tickets t
  SET    status = p_new_status
  WHERE  t.id   = p_ticket_id
  RETURNING
    t.id,
    t.status,
    t.updated_at;

  -- Notify client on any successful status change, unless the client is the actor
  IF v_client_id != auth.uid() THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (
      v_client_id,
      p_ticket_id,
      'status_change',
      'Tu ticket cambió de estado: ' || v_current_status || ' → ' || p_new_status || '.'
    );
  END IF;

  -- Notify assigned agent only when a client reopens (resuelto → reabierto)
  IF v_role = 'client' AND v_agent_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (
      v_agent_id,
      p_ticket_id,
      'status_change',
      'El cliente reabrió el ticket que tenés asignado.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_ticket_status(UUID, public.ticket_status) TO authenticated;


-- ============================================================
-- assign_ticket: add reassignment notification producer
-- (self-reassignment deliberately does NOT notify — corrected from
-- an earlier spec draft that said it should; confirmed with the
-- user during the design phase gate review)
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_ticket(
  p_ticket_id UUID,
  p_agent_id  UUID
)
RETURNS TABLE (
  id         UUID,
  agent_id   UUID,
  status     public.ticket_status,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_agent_id UUID;
BEGIN
  IF public.get_my_role() NOT IN ('agent', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden asignar tickets';
  END IF;

  SELECT t.agent_id INTO v_old_agent_id
  FROM public.tickets t
  WHERE t.id = p_ticket_id;

  RETURN QUERY
  UPDATE public.tickets t
  SET agent_id = p_agent_id,
      status   = 'en_proceso'
  WHERE t.id = p_ticket_id
  RETURNING
    t.id,
    t.agent_id,
    t.status,
    t.updated_at;

  INSERT INTO public.ticket_assignment_log
    (ticket_id, from_agent_id, to_agent_id, changed_by, changed_at)
  VALUES
    (p_ticket_id, v_old_agent_id, p_agent_id, auth.uid(), now());

  -- Notify only the newly assigned agent, excluding self-reassignment
  IF p_agent_id != auth.uid() THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (p_agent_id, p_ticket_id, 'reassignment', 'Se te asignó un ticket.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_ticket(UUID, UUID) TO authenticated;


-- ============================================================
-- add_ticket_comment: add new_comment notification producer
--
-- NOTE: reproduces the live body including the resolved-ticket guard
-- clause (IF v_ticket.status = 'resuelto' ...) which was applied live
-- via migration "block_comments_on_resolved_tickets" (version
-- 20260616170417) that has NO corresponding file anywhere in this
-- repo's migration history. Discovered via pg_get_functiondef() while
-- preparing this migration — see backlog notes for the full audit of
-- other similarly undocumented live migrations. Preserved here
-- verbatim so this CREATE OR REPLACE doesn't silently drop it.
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_ticket_comment(
  p_ticket_id UUID,
  p_content   TEXT
)
RETURNS TABLE (
  id             UUID,
  ticket_id      UUID,
  user_id        UUID,
  user_full_name TEXT,
  content        TEXT,
  created_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role      public.user_role;
  v_ticket    public.tickets;
  v_comment   public.ticket_comments;
  v_full_name TEXT;
BEGIN
  v_role := public.get_my_role();

  SELECT * INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id
    AND (
      v_role IN ('agent', 'admin')
      OR t.client_id = auth.uid()
      OR t.agent_id  = auth.uid()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'unauthorized: No tenés permiso para comentar en este ticket';
  END IF;

  IF v_ticket.status = 'resuelto' THEN
    RAISE EXCEPTION 'invalid_transition: No se pueden agregar comentarios a un ticket resuelto. Reabrilo para continuar.';
  END IF;

  INSERT INTO public.ticket_comments (ticket_id, user_id, content)
  VALUES (p_ticket_id, auth.uid(), p_content)
  RETURNING * INTO v_comment;

  SELECT u.full_name::TEXT INTO v_full_name FROM public.users u WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT
    v_comment.id,
    v_comment.ticket_id,
    v_comment.user_id,
    COALESCE(v_full_name, 'Usuario eliminado'),
    v_comment.content,
    v_comment.created_at;

  -- Notify client + assigned agent, excluding the comment author
  IF v_ticket.client_id != auth.uid() THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (v_ticket.client_id, p_ticket_id, 'new_comment', 'Nuevo comentario en tu ticket.');
  END IF;

  IF v_ticket.agent_id IS NOT NULL AND v_ticket.agent_id != auth.uid() THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (v_ticket.agent_id, p_ticket_id, 'new_comment', 'Nuevo comentario en un ticket asignado a vos.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_ticket_comment(UUID, TEXT) TO authenticated;


-- ============================================================
-- New RPCs: get_notifications, mark_notification_read, mark_all_notifications_read
-- Explicit REVOKE FROM PUBLIC included since Postgres grants EXECUTE
-- to PUBLIC (which includes anon) by default on every new function —
-- confirmed via get_advisors immediately after first applying these
-- without the revoke, then fixed in the same slice.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_notifications(
  p_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  ticket_id   UUID,
  type        public.notification_type,
  message     TEXT,
  is_read     BOOLEAN,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.ticket_id, n.type, n.message, n.is_read, n.created_at
  FROM public.notifications n
  WHERE n.user_id = auth.uid()
    AND (
      p_filter IS NULL
      OR p_filter = 'all'
      OR (p_filter = 'unread' AND n.is_read = false)
      OR n.type::text = p_filter
    )
  ORDER BY n.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_notifications(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notifications(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID
)
RETURNS TABLE (
  id      UUID,
  is_read BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.notifications n
  SET is_read = true
  WHERE n.id = p_notification_id
    AND n.user_id = auth.uid()
  RETURNING n.id, n.is_read;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS TABLE (
  updated_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.notifications n
  SET is_read = true
  WHERE n.user_id = auth.uid()
    AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
