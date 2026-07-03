-- ============================================================
-- MIGRATION 20260702000003 — Notification message copy fixes
-- SupportFlow Helpdesk
--
-- User feedback after testing the live notifications page (2026-07-02):
-- 1. status_change: show human labels ("En proceso"), not raw enum
--    values ("en_proceso"), matching StatusBadge.tsx's existing labels.
-- 2. new_comment (agent side): drop "a vos", end at "asignado."
-- 3. reassignment: include the ticket title alongside "Se te asignó".
--
-- Only affects new notifications going forward — existing rows keep
-- their original message text (consistent with this project's existing
-- precedent of never retroactively rewriting historical data, see the
-- SLA snapshot design).
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
      'Tu ticket cambió de estado: ' ||
      (CASE v_current_status
        WHEN 'abierto' THEN 'Abierto'
        WHEN 'en_proceso' THEN 'En proceso'
        WHEN 'resuelto' THEN 'Resuelto'
        WHEN 'reabierto' THEN 'Reabierto'
      END) ||
      ' → ' ||
      (CASE p_new_status
        WHEN 'abierto' THEN 'Abierto'
        WHEN 'en_proceso' THEN 'En proceso'
        WHEN 'resuelto' THEN 'Resuelto'
        WHEN 'reabierto' THEN 'Reabierto'
      END) || '.'
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
    VALUES (v_ticket.agent_id, p_ticket_id, 'new_comment', 'Nuevo comentario en un ticket asignado.');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_ticket_comment(UUID, TEXT) TO authenticated;


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
  v_title        TEXT;
BEGIN
  IF public.get_my_role() NOT IN ('agent', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden asignar tickets';
  END IF;

  SELECT t.agent_id, t.title INTO v_old_agent_id, v_title
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
    VALUES (p_agent_id, p_ticket_id, 'reassignment', 'Se te asignó el ticket "' || v_title || '".');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_ticket(UUID, UUID) TO authenticated;
