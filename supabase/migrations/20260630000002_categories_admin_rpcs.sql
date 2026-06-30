-- ============================================================
-- MIGRATION 20260630000002 — Categories Admin RPCs
-- SupportFlow Helpdesk
--
-- Changes:
--   1. ALTER TABLE categories ADD COLUMN is_active BOOLEAN
--   2. UPDATE get_categories() — filter to active-only
--   3. NEW admin_list_categories() — all rows, admin-only
--   4. NEW admin_create_category(p_name, p_description)
--   5. NEW admin_update_category(p_id, p_name, p_description)
--   6. NEW admin_toggle_category_status(p_id)
--   7. UPDATE get_tickets() — add category_is_active to RETURNS TABLE
--   8. UPDATE get_ticket_detail() — add category_is_active to RETURNS TABLE
-- ============================================================


-- ============================================================
-- 1. Add is_active column to categories
--    IF NOT EXISTS makes this idempotent.
--    Existing 3 seeded rows backfilled to true via DEFAULT.
-- ============================================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;


-- ============================================================
-- 2. get_categories — active-only filter
--    Behavioral change: was returning all rows; now returns
--    only is_active = true. Ticket create dropdown benefits
--    automatically (no component change needed).
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description
  FROM public.categories c
  WHERE c.is_active = true
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_categories() TO authenticated;


-- ============================================================
-- 3. admin_list_categories — all rows (active + inactive)
--    Admin-only via users table role check (matches project convention).
--    Returns SLA max_resolution_hours via LEFT JOIN.
-- ============================================================
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
    c.name,
    c.description,
    c.is_active,
    c.created_at,
    s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_categories() TO authenticated;


-- ============================================================
-- 4. admin_create_category
--    Admin-only. Validates name (NOT NULL, length ≤ 50).
--    DB unique constraint on categories.name propagates as
--    an error that parseRpcError surfaces in UI.
--    Returns the new row in the same shape as admin_list_categories.
-- ============================================================
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
    c.name,
    c.description,
    c.is_active,
    c.created_at,
    s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_category(TEXT, TEXT) TO authenticated;


-- ============================================================
-- 5. admin_update_category
--    Admin-only. Updates name and description only — never
--    touches is_active (that is admin_toggle_category_status).
--    Raises not_found if category does not exist.
-- ============================================================
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
    c.name,
    c.description,
    c.is_active,
    c.created_at,
    s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_category(UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
-- 6. admin_toggle_category_status
--    Admin-only. Flips is_active = NOT is_active.
--    Raises not_found if category does not exist.
--    Returns new is_active value.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_toggle_category_status(p_id UUID)
RETURNS TABLE (is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden cambiar el estado de categorías';
  END IF;

  UPDATE public.categories
  SET is_active = NOT is_active
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Categoría no encontrada';
  END IF;

  RETURN QUERY
  SELECT c.is_active
  FROM public.categories c
  WHERE c.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_category_status(UUID) TO authenticated;


-- ============================================================
-- 7. get_tickets — add category_is_active to RETURNS TABLE
--    Additive change only: new column appended to end.
--    Existing callers that ignore the new field are unaffected.
--    Full function body preserved exactly from 20260616000001.
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
    t.title,
    t.status,
    t.priority,
    t.category_id,
    c.name                   AS category_name,
    c.is_active              AS category_is_active,
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
-- 8. get_ticket_detail — add category_is_active to RETURNS TABLE
--    Additive change: new column required by the reopen gate
--    in TicketDetailPage (FR-CAT-07).
--    Full function body preserved exactly from 20260616000001.
-- ============================================================
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
    t.title,
    t.description,
    t.status,
    t.priority,
    t.category_id,
    c.name                  AS category_name,
    c.is_active             AS category_is_active,
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
