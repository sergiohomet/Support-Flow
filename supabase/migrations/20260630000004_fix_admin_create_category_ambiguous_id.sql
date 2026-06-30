-- ============================================================
-- MIGRATION 20260630000004 — Fix ambiguous "id" in admin_create_category
--
-- RETURNING id INTO v_new_id was ambiguous: PL/pgSQL couldn't tell if
-- "id" referred to the categories table column or the implicit output
-- variable from RETURNS TABLE(id UUID, ...). Qualify with the table
-- name to resolve. Pure bugfix, no behavioral change.
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
