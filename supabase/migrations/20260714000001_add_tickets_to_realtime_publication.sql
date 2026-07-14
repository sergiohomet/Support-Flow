-- ============================================================
-- MIGRATION 20260714000001 — add tickets to the realtime publication
-- SupportFlow Helpdesk
--
-- Bugfix. PR4 of the "ai-triage" change widened useTicketDetail.ts's
-- realtime channel to ALSO listen for postgres_changes UPDATE events on
-- public.tickets (so the "Sugerencias IA" panel appears without a manual
-- reload once ai_triage is written). That listener silently broke the
-- channel's PRE-EXISTING ticket_comments INSERT listener too — both
-- listeners share one channel/subscribe() call, and public.tickets was
-- never added to the supabase_realtime publication (only ticket_comments
-- was, from this project's initial schema). Subscribing to a table not in
-- the publication causes the whole channel subscription to fail, taking
-- down every listener on that channel, not just the new one.
--
-- Fix: add public.tickets to the publication so both listeners on the
-- shared channel work again.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
