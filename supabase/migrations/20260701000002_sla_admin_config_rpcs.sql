-- ============================================================
-- MIGRATION 20260701000002 — SLA admin config RPCs
-- SupportFlow Helpdesk
--
-- Changes:
--   1. NEW admin_get_sla_config() — list SLA config per category, admin-only
--   2. NEW admin_update_sla_config(p_category_id, p_max_resolution_hours,
--      p_escalation_enabled) — update SLA config for one category, admin-only
--
-- Conventions followed (see 20260630000002/3/4/5):
--   - Admin-only via public.users role check (v_role IS DISTINCT FROM 'admin').
--   - ::text casts on every VARCHAR-sourced column selected into a
--     TEXT-declared RETURNS TABLE column (categories.name is VARCHAR(50)).
--   - UPDATE target table aliased and every column reference qualified
--     to avoid PL/pgSQL implicit-variable ambiguity with RETURNS TABLE
--     output names (category_id here does not collide with sla_config's
--     own columns, but we alias defensively to stay consistent).
--
-- Note: sla_config already has a BEFORE UPDATE trigger
-- (set_updated_at_sla_config, migration 20260613000001) that sets
-- updated_at = NOW() automatically. We do not set it explicitly in
-- the UPDATE below to avoid a redundant, easy-to-drift second source
-- of truth for that column.
-- ============================================================

-- ============================================================
-- 1. admin_get_sla_config
--    Admin-only. Returns SLA config joined with category name.
--    INNER JOIN is safe here because every category is guaranteed
--    a sla_config row (seeded initially, and admin_create_category
--    now inserts a default row per migration 20260701000003).
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_sla_config()
RETURNS TABLE (
  category_id          UUID,
  category_name        TEXT,
  max_resolution_hours INTEGER,
  escalation_enabled   BOOLEAN,
  updated_at           TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden ver la configuración de SLA';
  END IF;

  RETURN QUERY
  SELECT c.id, c.name::text, s.max_resolution_hours, s.escalation_enabled, s.updated_at
  FROM public.categories c
  JOIN public.sla_config s ON s.category_id = c.id
  ORDER BY c.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_sla_config() TO authenticated;


-- ============================================================
-- 2. admin_update_sla_config
--    Admin-only. Validates max_resolution_hours in [1, 999]
--    (matches sla_config's CHECK (max_resolution_hours > 0) plus
--    an explicit upper bound so the UI can't set unbounded values).
--    Raises not_found if no sla_config row exists for the category.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_update_sla_config(
  p_category_id          UUID,
  p_max_resolution_hours INTEGER,
  p_escalation_enabled   BOOLEAN
)
RETURNS TABLE (
  category_id          UUID,
  category_name        TEXT,
  max_resolution_hours INTEGER,
  escalation_enabled   BOOLEAN,
  updated_at           TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT u.role INTO v_role FROM public.users u WHERE u.id = auth.uid();
  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo admins pueden modificar la configuración de SLA';
  END IF;

  IF p_max_resolution_hours IS NULL OR p_max_resolution_hours < 1 OR p_max_resolution_hours > 999 THEN
    RAISE EXCEPTION 'validation: Las horas máximas deben estar entre 1 y 999';
  END IF;

  UPDATE public.sla_config AS s
  SET max_resolution_hours = p_max_resolution_hours,
      escalation_enabled   = p_escalation_enabled
  WHERE s.category_id = p_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Configuración de SLA no encontrada para esta categoría';
  END IF;

  RETURN QUERY
  SELECT c.id, c.name::text, s.max_resolution_hours, s.escalation_enabled, s.updated_at
  FROM public.categories c
  JOIN public.sla_config s ON s.category_id = c.id
  WHERE c.id = p_category_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_sla_config(UUID, INTEGER, BOOLEAN) TO authenticated;
