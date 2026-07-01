-- ============================================================
-- MIGRATION 20260701000003 — Default SLA config on category create
-- SupportFlow Helpdesk
--
-- Product decision (confirmed 2026-07-01): every new category must
-- get a default sla_config row (max_resolution_hours = 24,
-- escalation_enabled = true) at creation time. Without this,
-- admin_get_sla_config's INNER JOIN would silently exclude any
-- category created after the initial seed, leaving it with no SLA
-- config editable from the admin UI.
--
-- CREATE OR REPLACE preserves the exact signature and RETURNS TABLE
-- shape from 20260630000004 (last fix to this function) — only the
-- function body changes, adding one INSERT after the categories
-- INSERT, in the same implicit transaction (PL/pgSQL functions run
-- atomically; if the sla_config insert fails, the categories insert
-- rolls back too).
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
  RETURNING categories.id INTO v_new_id;

  -- Default SLA config so admin_get_sla_config's INNER JOIN
  -- never silently excludes this category.
  INSERT INTO public.sla_config (category_id, max_resolution_hours, escalation_enabled)
  VALUES (v_new_id, 24, true);

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

GRANT EXECUTE ON FUNCTION public.admin_create_category(TEXT, TEXT) TO authenticated;
