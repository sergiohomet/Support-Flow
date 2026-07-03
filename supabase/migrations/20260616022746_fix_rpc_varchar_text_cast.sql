-- Fix varchar→text implicit cast mismatch in all ticket RPCs.
-- PostgreSQL does not coerce varchar(n) to text in RETURNS TABLE automatically.
-- Solution: add explicit ::TEXT casts on all varchar columns in SELECT/RETURNING.
--
-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.
-- Superseded in part by 20260630000003_fix_varchar_text_mismatch.sql.

-- 1. get_tickets
CREATE OR REPLACE FUNCTION public.get_tickets(
  p_status      public.ticket_status DEFAULT NULL,
  p_priority    public.ticket_priority DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_agent_id    UUID DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_page_size   INTEGER DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  status          public.ticket_status,
  priority        public.ticket_priority,
  category_id     UUID,
  category_name   TEXT,
  client_id       UUID,
  client_full_name TEXT,
  agent_id        UUID,
  agent_full_name TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ,
  comment_count   BIGINT,
  total_count     BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();
  RETURN QUERY
  SELECT
    t.id,
    t.title::TEXT,
    t.status,
    t.priority,
    t.category_id,
    c.name::TEXT             AS category_name,
    t.client_id,
    client_u.full_name::TEXT AS client_full_name,
    t.agent_id,
    agent_u.full_name::TEXT  AS agent_full_name,
    t.created_at,
    t.updated_at,
    (SELECT COUNT(*) FROM public.ticket_comments tc WHERE tc.ticket_id = t.id) AS comment_count,
    COUNT(*) OVER() AS total_count
  FROM public.tickets t
  JOIN public.categories c        ON c.id = t.category_id
  JOIN public.users client_u      ON client_u.id = t.client_id
  LEFT JOIN public.users agent_u  ON agent_u.id = t.agent_id
  WHERE
    (v_role IN ('agent', 'admin') OR t.client_id = auth.uid())
    AND (p_status      IS NULL OR t.status      = p_status)
    AND (p_priority    IS NULL OR t.priority    = p_priority)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_agent_id    IS NULL OR t.agent_id IS NOT DISTINCT FROM p_agent_id)
  ORDER BY t.created_at DESC
  OFFSET (p_page - 1) * p_page_size
  LIMIT  p_page_size;
END;
$$;

-- 2. get_ticket_detail
CREATE OR REPLACE FUNCTION public.get_ticket_detail(p_ticket_id UUID)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  description      TEXT,
  status           public.ticket_status,
  priority         public.ticket_priority,
  category_id      UUID,
  category_name    TEXT,
  client_id        UUID,
  client_full_name TEXT,
  agent_id         UUID,
  agent_full_name  TEXT,
  ai_triage        JSONB,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.get_my_role();
  RETURN QUERY
  SELECT
    t.id,
    t.title::TEXT,
    t.description,
    t.status,
    t.priority,
    t.category_id,
    c.name::TEXT             AS category_name,
    t.client_id,
    client_u.full_name::TEXT AS client_full_name,
    t.agent_id,
    agent_u.full_name::TEXT  AS agent_full_name,
    t.ai_triage,
    t.created_at,
    t.updated_at
  FROM public.tickets t
  JOIN public.categories c        ON c.id = t.category_id
  JOIN public.users client_u      ON client_u.id = t.client_id
  LEFT JOIN public.users agent_u  ON agent_u.id = t.agent_id
  WHERE t.id = p_ticket_id
    AND (v_role IN ('agent', 'admin') OR t.client_id = auth.uid() OR t.agent_id = auth.uid());
END;
$$;

-- 3. get_ticket_comments
CREATE OR REPLACE FUNCTION public.get_ticket_comments(p_ticket_id UUID)
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
STABLE
AS $$
DECLARE
  v_role   public.user_role;
  v_ticket public.tickets;
BEGIN
  v_role := public.get_my_role();
  SELECT * INTO v_ticket FROM public.tickets t
  WHERE t.id = p_ticket_id
    AND (v_role IN ('agent', 'admin') OR t.client_id = auth.uid() OR t.agent_id = auth.uid());
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    tc.id,
    tc.ticket_id,
    tc.user_id,
    COALESCE(u.full_name::TEXT, 'Usuario eliminado') AS user_full_name,
    tc.content,
    tc.created_at
  FROM public.ticket_comments tc
  LEFT JOIN public.users u ON u.id = tc.user_id
  WHERE tc.ticket_id = p_ticket_id
  ORDER BY tc.created_at ASC;
END;
$$;

-- 4. get_ticket_status_log
CREATE OR REPLACE FUNCTION public.get_ticket_status_log(p_ticket_id UUID)
RETURNS TABLE (
  id                   UUID,
  ticket_id            UUID,
  from_status          public.ticket_status,
  to_status            public.ticket_status,
  changed_by           UUID,
  changed_by_full_name TEXT,
  changed_at           TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role   public.user_role;
  v_ticket public.tickets;
BEGIN
  v_role := public.get_my_role();
  SELECT * INTO v_ticket FROM public.tickets t
  WHERE t.id = p_ticket_id
    AND (v_role IN ('agent', 'admin') OR t.client_id = auth.uid() OR t.agent_id = auth.uid());
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    sl.id,
    sl.ticket_id,
    sl.from_status,
    sl.to_status,
    sl.changed_by,
    u.full_name::TEXT AS changed_by_full_name,
    sl.changed_at
  FROM public.ticket_status_log sl
  JOIN public.users u ON u.id = sl.changed_by
  WHERE sl.ticket_id = p_ticket_id
  ORDER BY sl.changed_at ASC;
END;
$$;

-- 5. create_ticket
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
  INSERT INTO public.tickets (title, description, category_id, priority, client_id, status, agent_id)
  VALUES (p_title, p_description, p_category_id, p_priority, auth.uid(), 'abierto', NULL)
  RETURNING tickets.id, tickets.title::TEXT, tickets.status, tickets.created_at;
END;
$$;

-- 6. add_ticket_comment
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

-- 7. get_agents
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
    (SELECT COUNT(*) FROM public.tickets t
     WHERE t.agent_id = u.id AND t.status IN ('abierto', 'en_proceso', 'reabierto')) AS active_ticket_count
  FROM public.users u
  WHERE u.role IN ('agent', 'admin') AND u.is_active = TRUE
  ORDER BY u.full_name ASC;
END;
$$;

-- 8. get_categories
CREATE OR REPLACE FUNCTION public.get_categories()
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name::TEXT, c.description
  FROM public.categories c
  ORDER BY c.name ASC;
END;
$$;
