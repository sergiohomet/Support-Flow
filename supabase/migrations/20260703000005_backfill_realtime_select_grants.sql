-- ============================================================
-- MIGRATION 20260703000005 — Backfill: realtime SELECT grants
-- SupportFlow Helpdesk
--
-- Repo-hygiene backfill (2026-07-03). Two live-only migrations
-- (grant_select_ticket_comments_for_realtime, applied 2026-06-16;
-- grant_select_tickets_and_users_for_realtime_rls, applied 2026-06-18)
-- were never saved as files anywhere in this repo. Supabase Realtime's
-- postgres_changes requires the subscribing role to hold a base
-- SELECT grant on the table (RLS still applies independently on top)
-- — src/modules/tickets/hooks/useTicketDetail.ts's subscription on
-- ticket_comments needs this grant to receive INSERT events at all.
--
-- Confirmed via information_schema.role_table_grants against the live
-- DB before writing this file — applying it is a no-op against
-- production, it only closes the gap for anyone rebuilding from these
-- files alone.
-- ============================================================

GRANT SELECT ON public.ticket_comments TO authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT SELECT ON public.users TO authenticated;
