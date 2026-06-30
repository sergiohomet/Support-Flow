-- ============================================================
-- MIGRATION 20260630000003 — Fix VARCHAR/TEXT RETURN QUERY mismatch
-- SupportFlow Helpdesk
--
-- Root cause: PL/pgSQL's RETURN QUERY enforces a strict type-OID
-- match between the SELECT's actual column types and the function's
-- declared RETURNS TABLE types. VARCHAR(n) is NOT auto-coerced to
-- TEXT in this context, even though the two are normally considered
-- binary-compatible. Selecting categories.name (VARCHAR(50)),
-- users.full_name/specialty (VARCHAR), or tickets.title
-- (VARCHAR(200)) directly into a TEXT-declared output column raises:
--   ERROR 42804: structure of query does not match function result type
--
-- This bug predates this session — it has existed since the
-- original 20260613/20260616 migrations — but was never exercised
-- against live Postgres because the test suite mocks the RPC layer.
--
-- Fix: add explicit ::text casts on every VARCHAR-sourced column
-- selected into a TEXT-declared column. Pure cast addition — no
-- behavioral, schema, or signature change. Function return types
-- are unchanged, so no TypeScript type regeneration is needed.
-- ============================================================

-- ------------------------------------------------------------
-- get_categories
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_categories()
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    c.description
  FROM public.categories c
  WHERE c.is_active = true
  ORDER BY c.name ASC;
END;
$$;

-- ------------------------------------------------------------
-- admin_list_categories
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_categories()
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  description          TEXT,
  is_active            BOOLEAN,
  created_at           TIMESTAMPTZ,
  max_resolution_hours INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden listar todas las categorías';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    c.description,
    c.is_active,
    c.created_at,
    s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  ORDER BY c.name ASC;
END;
$$;

-- ------------------------------------------------------------
-- admin_create_category
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_category(
  p_name        TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  description          TEXT,
  is_active            BOOLEAN,
  created_at           TIMESTAMPTZ,
  max_resolution_hours INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   public.user_role;
  v_new_id UUID;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden crear categorías';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'validation: El nombre no puede estar vacío';
  END IF;

  IF length(trim(p_name)) > 50 THEN
    RAISE EXCEPTION 'validation: El nombre no puede superar los 50 caracteres';
  END IF;

  INSERT INTO public.categories (name, description, is_active)
  VALUES (trim(p_name), p_description, true)
  RETURNING id INTO v_new_id;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    c.description,
    c.is_active,
    c.created_at,
    s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = v_new_id;
END;
$$;

-- ------------------------------------------------------------
-- admin_update_category
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_category(
  p_id          UUID,
  p_name        TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                   UUID,
  name                 TEXT,
  description          TEXT,
  is_active            BOOLEAN,
  created_at           TIMESTAMPTZ,
  max_resolution_hours INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden actualizar categorías';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'validation: El nombre no puede estar vacío';
  END IF;

  IF length(trim(p_name)) > 50 THEN
    RAISE EXCEPTION 'validation: El nombre no puede superar los 50 caracteres';
  END IF;

  UPDATE public.categories
  SET name        = trim(p_name),
      description = p_description
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Categoría no encontrada';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name::text,
    c.description,
    c.is_active,
    c.created_at,
    s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = p_id;
END;
$$;

-- ------------------------------------------------------------
-- get_tickets
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tickets(
  p_status      public.ticket_status DEFAULT NULL,
  p_priority    public.ticket_priority DEFAULT NULL,
  p_category_id UUID DEFAULT NULL,
  p_agent_id    UUID DEFAULT NULL,
  p_page        INTEGER DEFAULT 1,
  p_page_size   INTEGER DEFAULT 10
)
RETURNS TABLE (
  id                 UUID,
  title              TEXT,
  status             public.ticket_status,
  priority           public.ticket_priority,
  category_id        UUID,
  category_name      TEXT,
  category_is_active BOOLEAN,
  client_id          UUID,
  client_full_name   TEXT,
  agent_id           UUID,
  agent_full_name    TEXT,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  comment_count      BIGINT,
  total_count        BIGINT
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
    t.title::text,
    t.status,
    t.priority,
    t.category_id,
    c.name::text             AS category_name,
    c.is_active              AS category_is_active,
    t.client_id,
    client_u.full_name::text AS client_full_name,
    t.agent_id,
    agent_u.full_name::text  AS agent_full_name,
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

-- ------------------------------------------------------------
-- get_ticket_detail
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ticket_detail(
  p_ticket_id UUID
)
RETURNS TABLE (
  id                 UUID,
  title              TEXT,
  description        TEXT,
  status             public.ticket_status,
  priority           public.ticket_priority,
  category_id        UUID,
  category_name      TEXT,
  category_is_active BOOLEAN,
  client_id          UUID,
  client_full_name   TEXT,
  agent_id           UUID,
  agent_full_name    TEXT,
  ai_triage          JSONB,
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ
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
    t.title::text,
    t.description,
    t.status,
    t.priority,
    t.category_id,
    c.name::text             AS category_name,
    c.is_active              AS category_is_active,
    t.client_id,
    client_u.full_name::text AS client_full_name,
    t.agent_id,
    agent_u.full_name::text  AS agent_full_name,
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

-- ------------------------------------------------------------
-- get_ticket_comments
-- ------------------------------------------------------------
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
    COALESCE(u.full_name::text, 'Usuario eliminado') AS user_full_name,
    tc.content,
    tc.created_at
  FROM public.ticket_comments tc
  LEFT JOIN public.users u ON u.id = tc.user_id
  WHERE tc.ticket_id = p_ticket_id
  ORDER BY tc.created_at ASC;
END;
$$;

-- ------------------------------------------------------------
-- get_ticket_status_log
-- ------------------------------------------------------------
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
    u.full_name::text AS changed_by_full_name,
    sl.changed_at
  FROM public.ticket_status_log sl
  JOIN public.users u ON u.id = sl.changed_by
  WHERE sl.ticket_id = p_ticket_id
  ORDER BY sl.changed_at ASC;
END;
$$;

-- ------------------------------------------------------------
-- create_ticket
-- ------------------------------------------------------------
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
    tickets.title::text,
    tickets.status,
    tickets.created_at;
END;
$$;

-- ------------------------------------------------------------
-- get_agents
-- ------------------------------------------------------------
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
    u.full_name::text,
    u.specialty::text,
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

-- ------------------------------------------------------------
-- admin_list_users
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_role      public.user_role DEFAULT NULL,
  p_search    TEXT             DEFAULT NULL,
  p_is_active BOOLEAN          DEFAULT NULL,
  p_page      INT              DEFAULT 1,
  p_page_size INT              DEFAULT 20
)
RETURNS TABLE (
  id          UUID,
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  role        public.user_role,
  specialty   TEXT,
  is_active   BOOLEAN,
  created_at  TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
BEGIN
  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    au.email::text,
    u.full_name::text,
    u.avatar_url,
    u.role,
    u.specialty::text,
    u.is_active,
    u.created_at,
    COUNT(*) OVER () AS total_count
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE
    (p_role IS NULL OR u.role = p_role)
    AND (p_is_active IS NULL OR u.is_active = p_is_active)
    AND (
      p_search IS NULL
      OR u.full_name ILIKE '%' || p_search || '%'
      OR au.email ILIKE '%' || p_search || '%'
    )
  ORDER BY u.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;
