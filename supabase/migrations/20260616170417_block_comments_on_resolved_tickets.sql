-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.
-- Superseded by 20260702000003_notifications_message_copy_fixes.sql, which
-- redefines add_ticket_comment again with updated notification copy.

CREATE OR REPLACE FUNCTION public.add_ticket_comment(p_ticket_id UUID, p_content TEXT)
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
  SELECT * INTO v_ticket FROM public.tickets t
  WHERE t.id = p_ticket_id
    AND (v_role IN ('agent', 'admin') OR t.client_id = auth.uid() OR t.agent_id = auth.uid());
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
  SELECT v_comment.id, v_comment.ticket_id, v_comment.user_id,
    COALESCE(v_full_name, 'Usuario eliminado'),
    v_comment.content, v_comment.created_at;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;
