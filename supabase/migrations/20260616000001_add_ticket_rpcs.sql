-- ============================================================
-- MIGRATION 20260616000001 — Ticket RPCs
-- SupportFlow Helpdesk
--
-- Critical invariants:
--   1. update_ticket_status → does NOT write to ticket_status_log.
--      The log_ticket_status_change trigger (migration 001) fires
--      automatically on tickets.status UPDATE.
--   2. assign_ticket → no BEGIN/EXCEPTION wrapper.
--      validate_agent_limit and validate_agent_role triggers raise
--      'agent_limit_exceeded: ...' and 'invalid_agent_role: ...'
--      which must propagate untouched to the caller.
--   3. All RPCs: SECURITY DEFINER + GRANT EXECUTE TO authenticated.
--   4. Optional filters: DEFAULT NULL + (p_x IS NULL OR col = p_x).
--   5. Nullable FK columns (agent_id, category_id): IS NOT DISTINCT FROM.
-- ============================================================

-- ============================================================
-- 1. get_tickets
--    Role-aware ticket list with filters + pagination.
--    Clients see only their own tickets; agents/admins see all.
--    total_count via COUNT(*) OVER() — single round-trip.
-- ============================================================
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
    t.title,
    t.status,
    t.priority,
    t.category_id,
    c.name                   AS category_name,
    t.client_id,
    client_u.full_name       AS client_full_name,
    t.agent_id,
    agent_u.full_name        AS agent_full_name,
    t.created_at,
    t.updated_at,
    (
      SELECT COUNT(*)
      FROM public.ticket_comments tc
      WHERE tc.ticket_id = t.id
    )                        AS comment_count,
    COUNT(*) OVER()          AS total_count
  FROM public.tickets t
  JOIN public.categories c    ON c.id = t.category_id
  JOIN public.users client_u  ON client_u.id = t.client_id
  LEFT JOIN public.users agent_u ON agent_u.id = t.agent_id
  WHERE
    -- role-aware scoping
    (v_role IN ('agent', 'admin') OR t.client_id = auth.uid())
    -- optional filters
    AND (p_status      IS NULL OR t.status      = p_status)
    AND (p_priority    IS NULL OR t.priority    = p_priority)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_agent_id    IS NULL OR t.agent_id IS NOT DISTINCT FROM p_agent_id)
  ORDER BY t.created_at DESC
  OFFSET (p_page - 1) * p_page_size
  LIMIT  p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tickets(
  public.ticket_status, public.ticket_priority, UUID, UUID, INTEGER, INTEGER
) TO authenticated;


-- ============================================================
-- 2. get_ticket_detail
--    Full ticket with names + ai_triage.
--    Returns 0 rows if the caller has no visibility (RLS equivalent).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ticket_detail(
  p_ticket_id UUID
)
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
    t.title,
    t.description,
    t.status,
    t.priority,
    t.category_id,
    c.name                  AS category_name,
    t.client_id,
    client_u.full_name      AS client_full_name,
    t.agent_id,
    agent_u.full_name       AS agent_full_name,
    t.ai_triage,
    t.created_at,
    t.updated_at
  FROM public.tickets t
  JOIN public.categories c    ON c.id = t.category_id
  JOIN public.users client_u  ON client_u.id = t.client_id
  LEFT JOIN public.users agent_u ON agent_u.id = t.agent_id
  WHERE t.id = p_ticket_id
    AND (
      v_role IN ('agent', 'admin')
      OR t.client_id = auth.uid()
      OR t.agent_id  = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_detail(UUID) TO authenticated;


-- ============================================================
-- 3. get_ticket_comments
--    Comments with author full_name, ordered ASC.
--    Visibility guard mirrors ticket visibility.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ticket_comments(
  p_ticket_id UUID
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
STABLE
AS $$
DECLARE
  v_role   public.user_role;
  v_ticket public.tickets;
BEGIN
  v_role := public.get_my_role();

  -- Verify caller can see the ticket
  SELECT * INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id
    AND (
      v_role IN ('agent', 'admin')
      OR t.client_id = auth.uid()
      OR t.agent_id  = auth.uid()
    );

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    tc.id,
    tc.ticket_id,
    tc.user_id,
    COALESCE(u.full_name, 'Usuario eliminado') AS user_full_name,
    tc.content,
    tc.created_at
  FROM public.ticket_comments tc
  LEFT JOIN public.users u ON u.id = tc.user_id
  WHERE tc.ticket_id = p_ticket_id
  ORDER BY tc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_comments(UUID) TO authenticated;


-- ============================================================
-- 4. get_ticket_status_log
--    Status audit log with actor full_name, ordered ASC.
--    Visibility guard mirrors ticket visibility.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_ticket_status_log(
  p_ticket_id UUID
)
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

  -- Verify caller can see the ticket
  SELECT * INTO v_ticket
  FROM public.tickets t
  WHERE t.id = p_ticket_id
    AND (
      v_role IN ('agent', 'admin')
      OR t.client_id = auth.uid()
      OR t.agent_id  = auth.uid()
    );

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sl.id,
    sl.ticket_id,
    sl.from_status,
    sl.to_status,
    sl.changed_by,
    u.full_name  AS changed_by_full_name,
    sl.changed_at
  FROM public.ticket_status_log sl
  JOIN public.users u ON u.id = sl.changed_by
  WHERE sl.ticket_id = p_ticket_id
  ORDER BY sl.changed_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_status_log(UUID) TO authenticated;


-- ============================================================
-- 5. create_ticket
--    Client-only. Hardcodes client_id=auth.uid(), status='abierto',
--    agent_id=NULL. Returns new ticket id, title, status, created_at.
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
  INSERT INTO public.tickets (title, description, category_id, priority, client_id, status, agent_id)
  VALUES (p_title, p_description, p_category_id, p_priority, auth.uid(), 'abierto', NULL)
  RETURNING
    tickets.id,
    tickets.title,
    tickets.status,
    tickets.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_ticket(TEXT, TEXT, UUID, public.ticket_priority) TO authenticated;


-- ============================================================
-- 6. assign_ticket
--    Agent/admin only. Updates agent_id and sets status to
--    'en_proceso'. No exception handling — validate_agent_limit
--    and validate_agent_role triggers propagate their RAISE
--    EXCEPTION untouched ('agent_limit_exceeded: ...' and
--    'invalid_agent_role: ...').
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
BEGIN
  IF public.get_my_role() NOT IN ('agent', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden asignar tickets';
  END IF;

  -- Triggers fire here:
  --   validate_agent_limit: raises 'agent_limit_exceeded: ...' if >= 5 active
  --   validate_agent_role:  raises 'invalid_agent_role: ...' if user is not agent/admin
  -- Both exceptions propagate untouched — do NOT add EXCEPTION block.
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_ticket(UUID, UUID) TO authenticated;


-- ============================================================
-- 7. update_ticket_status
--    Role-aware status transition with validation.
--    Does NOT insert into ticket_status_log — the
--    log_ticket_status_change trigger does that automatically
--    on tickets.status UPDATE.
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
  v_valid          BOOLEAN := FALSE;
BEGIN
  v_role := public.get_my_role();

  -- Load current ticket state
  SELECT t.status, t.client_id
  INTO   v_current_status, v_client_id
  FROM   public.tickets t
  WHERE  t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Ticket no encontrado';
  END IF;

  IF v_role = 'client' THEN
    -- Clients: only allowed transition is resuelto → reabierto, on own ticket
    IF v_client_id != auth.uid() THEN
      RAISE EXCEPTION 'unauthorized: No tenés permiso para modificar este ticket';
    END IF;

    IF NOT (v_current_status = 'resuelto' AND p_new_status = 'reabierto') THEN
      RAISE EXCEPTION 'invalid_transition: Los clientes solo pueden reabrir tickets resueltos';
    END IF;

  ELSE
    -- Agents / admins: validate against the canonical transition map
    -- abierto    → en_proceso, resuelto
    -- en_proceso → resuelto, abierto
    -- resuelto   → reabierto
    -- reabierto  → en_proceso, resuelto
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

  -- UPDATE tickets.status only.
  -- The log_ticket_status_change trigger (migration 001) fires automatically
  -- AFTER this UPDATE and inserts into ticket_status_log.
  -- DO NOT insert into ticket_status_log here.
  RETURN QUERY
  UPDATE public.tickets t
  SET    status = p_new_status
  WHERE  t.id   = p_ticket_id
  RETURNING
    t.id,
    t.status,
    t.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_ticket_status(UUID, public.ticket_status) TO authenticated;


-- ============================================================
-- 8. add_ticket_comment
--    Any authenticated user who can see the ticket may comment.
--    Returns the inserted comment with author full_name.
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

  -- Verify caller has visibility on the ticket
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

  -- Insert comment
  INSERT INTO public.ticket_comments (ticket_id, user_id, content)
  VALUES (p_ticket_id, auth.uid(), p_content)
  RETURNING * INTO v_comment;

  -- Fetch author name
  SELECT u.full_name INTO v_full_name
  FROM public.users u
  WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT
    v_comment.id,
    v_comment.ticket_id,
    v_comment.user_id,
    COALESCE(v_full_name, 'Usuario eliminado'),
    v_comment.content,
    v_comment.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_ticket_comment(UUID, TEXT) TO authenticated;


-- ============================================================
-- 9. get_agents
--    Returns all active users with role agent or admin,
--    with their current active_ticket_count (informational).
--    The DB trigger enforces the 5-ticket limit — this count
--    is UX hint only, does NOT block selection.
-- ============================================================
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
    u.full_name,
    u.specialty,
    (
      SELECT COUNT(*)
      FROM public.tickets t
      WHERE t.agent_id = u.id
        AND t.status IN ('abierto', 'en_proceso', 'reabierto')
    ) AS active_ticket_count
  FROM public.users u
  WHERE u.role IN ('agent', 'admin')
    AND u.is_active = TRUE
  ORDER BY u.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agents() TO authenticated;


-- ============================================================
-- 10. get_categories
--     Returns all categories for form dropdowns and filters.
-- ============================================================
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
  SELECT
    c.id,
    c.name,
    c.description
  FROM public.categories c
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_categories() TO authenticated;
