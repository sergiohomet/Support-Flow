-- ============================================================
-- MIGRATION 20260703000008 — Specialty becomes a real category FK
-- SupportFlow Helpdesk
--
-- Replaces users.specialty (free TEXT matched by category name) with
-- users.category_id (UUID FK to categories.id). Free-text matching
-- meant a renamed category silently orphaned every agent's specialty.
--
-- Business rules (confirmed with user):
-- - category_id is set if and only if role = 'agent' (enforced by CHECK).
-- - category_id is mandatory when promoting/creating a user as agent.
-- - Ticket visibility: agents only see tickets in their own category
--   (plus tickets already assigned to them, for continuity) — admins
--   see everything, clients see their own tickets.
-- - Ticket assignment: an agent can only be assigned a ticket matching
--   their category — hard rule, no admin override.
--
-- All non-admin users were wiped by the caller before this migration
-- (test data only), so no data backfill is needed for category_id.
-- ============================================================

ALTER TABLE public.users ADD COLUMN category_id UUID REFERENCES public.categories(id);

ALTER TABLE public.users DROP COLUMN specialty;

ALTER TABLE public.users
  ADD CONSTRAINT users_category_id_only_for_agents
  CHECK (
    (role = 'agent' AND category_id IS NOT NULL)
    OR (role != 'agent' AND category_id IS NULL)
  );

-- ── get_agents(): category_id + category_name instead of specialty text ────

DROP FUNCTION IF EXISTS public.get_agents();

CREATE FUNCTION public.get_agents()
RETURNS TABLE(id uuid, full_name text, category_id uuid, category_name text, active_ticket_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.full_name::TEXT,
    u.category_id,
    c.name::TEXT AS category_name,
    (
      SELECT COUNT(*)
      FROM public.tickets t
      WHERE t.agent_id = u.id
        AND t.status IN ('abierto', 'en_proceso', 'reabierto')
    ) AS active_ticket_count
  FROM public.users u
  LEFT JOIN public.categories c ON c.id = u.category_id
  WHERE u.role = 'agent'
    AND u.is_active = TRUE
  ORDER BY u.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agents() TO authenticated;

-- ── admin_list_users(): category_id + category_name instead of specialty ───

DROP FUNCTION IF EXISTS public.admin_list_users(user_role, text, boolean, integer, integer);

CREATE FUNCTION public.admin_list_users(
  p_role user_role DEFAULT NULL::user_role,
  p_search text DEFAULT NULL::text,
  p_is_active boolean DEFAULT NULL::boolean,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS TABLE(id uuid, email text, full_name text, avatar_url text, role user_role, category_id uuid, category_name text, is_active boolean, created_at timestamptz, total_count bigint)
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
    u.category_id,
    c.name::text AS category_name,
    u.is_active,
    u.created_at,
    count(*) over () as total_count
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  LEFT JOIN public.categories c ON c.id = u.category_id
  WHERE
    (p_role is null or u.role = p_role)
    and (p_is_active is null or u.is_active = p_is_active)
    and (
      p_search is null
      or u.full_name ilike '%' || p_search || '%'
      or au.email ilike '%' || p_search || '%'
    )
  ORDER BY u.created_at desc
  LIMIT p_page_size
  OFFSET (p_page - 1) * p_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users(user_role, text, boolean, integer, integer) TO authenticated;

-- ── admin_update_user_role(): promoting to agent now requires a category ───

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
  p_user_id     UUID,
  p_new_role    public.user_role,
  p_category_id UUID DEFAULT NULL
)
RETURNS void
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
    RAISE EXCEPTION 'unauthorized: Only admins can update user roles';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'unauthorized: Cannot change your own role';
  END IF;

  IF p_new_role = 'agent' AND p_category_id IS NULL THEN
    RAISE EXCEPTION 'category_required: Debe especificar una categoría al asignar el rol agent';
  END IF;

  UPDATE public.users
  SET role = p_new_role,
      category_id = CASE WHEN p_new_role = 'agent' THEN p_category_id ELSE NULL END
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: User not found';
  END IF;
END;
$$;

-- ── admin_update_user_specialty(): now takes category_id, mandatory ────────

DROP FUNCTION IF EXISTS public.admin_update_user_specialty(uuid, text);

CREATE FUNCTION public.admin_update_user_specialty(
  p_user_id     UUID,
  p_category_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role public.user_role;
  v_target_role public.user_role;
BEGIN
  SELECT u.role INTO v_caller_role
  FROM public.users u
  WHERE u.id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Only admins can update user specialty';
  END IF;

  SELECT u.role INTO v_target_role
  FROM public.users u
  WHERE u.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: User not found';
  END IF;

  IF v_target_role != 'agent' THEN
    RAISE EXCEPTION 'invalid_role: La especialidad solo aplica a usuarios con rol agent';
  END IF;

  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'category_required: La especialidad es obligatoria para agentes';
  END IF;

  UPDATE public.users
  SET category_id = p_category_id
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_specialty(uuid, uuid) TO authenticated;

-- ── get_tickets(): agents only see tickets in their own category ───────────
-- (plus tickets already assigned to them, for continuity). Admins and
-- clients keep their existing visibility.

CREATE OR REPLACE FUNCTION public.get_tickets(
  p_status      ticket_status DEFAULT NULL::ticket_status,
  p_priority    ticket_priority DEFAULT NULL::ticket_priority,
  p_category_id uuid DEFAULT NULL::uuid,
  p_agent_id    uuid DEFAULT NULL::uuid,
  p_page        integer DEFAULT 1,
  p_page_size   integer DEFAULT 10
)
RETURNS TABLE(id uuid, title text, status ticket_status, priority ticket_priority, category_id uuid, category_name text, category_is_active boolean, client_id uuid, client_full_name text, agent_id uuid, agent_full_name text, created_at timestamptz, updated_at timestamptz, comment_count bigint, total_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_role public.user_role;
  v_caller_category UUID;
BEGIN
  v_role := public.get_my_role();

  IF v_role = 'agent' THEN
    SELECT u.category_id INTO v_caller_category FROM public.users u WHERE u.id = auth.uid();
  END IF;

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
    (
      v_role = 'admin'
      OR t.client_id = auth.uid()
      OR (v_role = 'agent' AND (t.agent_id = auth.uid() OR t.category_id = v_caller_category))
    )
    AND (p_status      IS NULL OR t.status      = p_status)
    AND (p_priority    IS NULL OR t.priority    = p_priority)
    AND (p_category_id IS NULL OR t.category_id = p_category_id)
    AND (p_agent_id    IS NULL OR t.agent_id IS NOT DISTINCT FROM p_agent_id)
  ORDER BY t.created_at DESC
  OFFSET (p_page - 1) * p_page_size
  LIMIT  p_page_size;
END;
$$;

-- ── assign_ticket(): hard category match, no override (incl. admin) ────────

CREATE OR REPLACE FUNCTION public.assign_ticket(p_ticket_id uuid, p_agent_id uuid)
RETURNS TABLE(id uuid, agent_id uuid, status ticket_status, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_agent_id    UUID;
  v_title           TEXT;
  v_ticket_category UUID;
  v_agent_category  UUID;
BEGIN
  IF public.get_my_role() NOT IN ('agent', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden asignar tickets';
  END IF;

  SELECT t.agent_id, t.title, t.category_id INTO v_old_agent_id, v_title, v_ticket_category
  FROM public.tickets t
  WHERE t.id = p_ticket_id;

  SELECT u.category_id INTO v_agent_category
  FROM public.users u
  WHERE u.id = p_agent_id AND u.role = 'agent';

  IF v_agent_category IS DISTINCT FROM v_ticket_category THEN
    RAISE EXCEPTION 'category_mismatch: El agente no tiene la especialidad requerida para este ticket';
  END IF;

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
