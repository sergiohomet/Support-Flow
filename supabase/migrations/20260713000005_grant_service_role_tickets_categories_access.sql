-- ============================================================
-- MIGRATION 20260713000005 — grant service_role table access for ai-triage
-- SupportFlow Helpdesk
--
-- Every existing write/read path in this project goes through
-- SECURITY DEFINER RPCs, which execute with the privileges of the
-- function OWNER (not the calling role) — so no table has ever needed
-- direct GRANTs for service_role, except `users` (needed by the
-- create-user Edge Function's direct `.from('users')` calls).
--
-- The ai-triage Edge Function is the first piece of code in this project
-- to query/update tables directly (not via an RPC) using the service-role
-- key: it reads `tickets`/`categories` and writes `tickets.ai_triage`.
-- Live-verified this failed with "permission denied for table tickets"
-- until this grant was added — service_role bypasses RLS (Supabase
-- platform default) but table-level GRANTs are a separate, required
-- layer that was simply never needed by any other code path until now.
--
-- This statement is idempotent (GRANT is safe to re-run) — it was
-- already applied directly against the live project during debugging,
-- before this file existed; committing it now so the change is tracked
-- in git and reproducible for any other environment.
-- ============================================================

GRANT SELECT, UPDATE ON public.tickets TO service_role;
GRANT SELECT ON public.categories TO service_role;
