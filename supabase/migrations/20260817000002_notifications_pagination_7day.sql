-- ============================================================
-- MIGRATION 20260817000002 — Notifications: pagination + 7-day window
-- SupportFlow Helpdesk
--
-- Adds server-side pagination to get_notifications (p_page,
-- p_page_size), scopes the "unread" filter and
-- has_unread_notifications() to a 7-day window, scopes
-- mark_all_notifications_read() to the same window, and adds
-- an index for efficient filtered queries.
-- ============================================================


-- ── get_notifications: paginated version ──────────────────────
-- Drop old single-param overload before creating new signature
DROP FUNCTION IF EXISTS public.get_notifications(text);

CREATE OR REPLACE FUNCTION public.get_notifications(
  p_filter    TEXT    DEFAULT NULL,
  p_page      INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  id          UUID,
  ticket_id   UUID,
  type        public.notification_type,
  message     TEXT,
  is_read     BOOLEAN,
  created_at  TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$
DECLARE
  v_offset INTEGER := (p_page - 1) * p_page_size;
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT n.id, n.ticket_id, n.type, n.message, n.is_read, n.created_at
    FROM public.notifications n
    WHERE n.user_id = auth.uid()
      AND (
        p_filter IS NULL
        OR p_filter = 'all'
        OR (p_filter = 'unread' AND n.is_read = false
            AND n.created_at >= now() - interval '7 days')
        OR n.type::text = p_filter
      )
    ORDER BY n.created_at DESC
  ),
  counted AS (
    SELECT f.*, COUNT(*) OVER() AS full_count
    FROM filtered f
  )
  SELECT
    c.id, c.ticket_id, c.type, c.message, c.is_read, c.created_at,
    c.full_count
  FROM counted c
  LIMIT p_page_size OFFSET v_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_notifications(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notifications(TEXT, INTEGER, INTEGER) TO authenticated;


-- ── has_unread_notifications: scoped to 7-day window ─────────
CREATE OR REPLACE FUNCTION public.has_unread_notifications()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = auth.uid()
      AND is_read = false
      AND created_at >= now() - interval '7 days'
  );
$$;


-- ── mark_all_notifications_read: scoped to 7-day window ──────
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS TABLE (updated_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH updated AS (
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid()
      AND is_read = false
      AND created_at >= now() - interval '7 days'
    RETURNING 1
  )
  SELECT COUNT(*)::bigint FROM updated;
END;
$$;


-- ── Index for efficient filtered queries ─────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, is_read, created_at DESC);
