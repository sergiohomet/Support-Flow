-- Fix admin check: query users table instead of JWT claim (matches project convention)
--
-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.
-- Superseded by 20260630000004_fix_admin_create_category_ambiguous_id.sql and
-- 20260630000005_fix_admin_categories_ambiguous_columns.sql.

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
  SELECT c.id, c.name, c.description, c.is_active, c.created_at, s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  ORDER BY c.name ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_list_categories() TO authenticated;

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
  SELECT c.id, c.name, c.description, c.is_active, c.created_at, s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = v_new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_create_category(TEXT, TEXT) TO authenticated;

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
  UPDATE public.categories SET name = trim(p_name), description = p_description WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Categoría no encontrada';
  END IF;
  RETURN QUERY
  SELECT c.id, c.name, c.description, c.is_active, c.created_at, s.max_resolution_hours
  FROM public.categories c
  LEFT JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_category(UUID, TEXT, TEXT) TO authenticated;

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
  UPDATE public.categories SET is_active = NOT is_active WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Categoría no encontrada';
  END IF;
  RETURN QUERY SELECT c.is_active FROM public.categories c WHERE c.id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_toggle_category_status(UUID) TO authenticated;
