-- ============================================================
-- MIGRATION 20260630000005 — Fix ambiguous column refs in
-- admin_update_category and admin_toggle_category_status
--
-- Same root cause as admin_create_category: when RETURNS TABLE
-- declares an output column whose name matches a real table column
-- (id, is_active), PL/pgSQL creates an implicit variable for it that
-- shadows the table column inside UPDATE/WHERE clauses unless
-- explicitly qualified with a table alias. Fix: alias the target
-- table and qualify every column reference. Pure bugfix.
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

  UPDATE public.categories AS c
  SET name        = trim(p_name),
      description = p_description
  WHERE c.id = p_id;

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

  UPDATE public.categories AS c
  SET is_active = NOT c.is_active
  WHERE c.id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Categoría no encontrada';
  END IF;

  RETURN QUERY
  SELECT c.is_active
  FROM public.categories c
  WHERE c.id = p_id;
END;
$$;
