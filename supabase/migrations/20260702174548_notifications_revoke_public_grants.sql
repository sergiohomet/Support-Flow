-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.

REVOKE EXECUTE ON FUNCTION public.get_notifications(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_notifications(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
