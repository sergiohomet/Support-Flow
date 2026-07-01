-- ============================================================
-- MIGRATION 20260701000009 — Internal RPC to re-sync the Vault secret
-- used by the SLA escalation cron
-- SupportFlow Helpdesk
--
-- BUG FOUND (2026-07-01, manual testing): the sla-escalation-check
-- Edge Function's pg_cron job was failing 401 Unauthorized on every
-- single invocation since it was first scheduled (Slice 3). Root
-- cause: the value copied from the Supabase dashboard into
-- `vault.create_secret('sla_service_role_key', ...)` was the LEGACY
-- JWT-format service_role key (219 chars), but the value Supabase
-- actually auto-injects into deployed Edge Functions as
-- `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` turned out to be the
-- newer short-format secret key (41 chars) — two different strings
-- for what is nominally "the same" credential, because this project
-- has both API key formats available in parallel during Supabase's
-- key-format migration.
--
-- FIX: this RPC lets the Edge Function itself write its own,
-- authoritative env value into the Vault secret — the value never
-- passes through a human, a chat transcript, or a committed file at
-- any point. It was invoked once (2026-07-01) via a temporary Edge
-- Function build to perform the one-time re-sync; the real
-- sla-escalation-check function (unchanged code, see
-- supabase/functions/sla-escalation-check/index.ts) was redeployed
-- immediately after and confirmed working (3 real overdue tickets
-- escalated successfully on the next invocation).
--
-- Kept installed (not dropped) as a reusable fix in case Supabase
-- rotates or changes the injected key format again in the future —
-- locked to service_role only via REVOKE/GRANT, exactly like
-- run_sla_escalation_check, so no end user or anon/authenticated
-- caller can ever invoke it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.internal_sync_sla_service_role_secret(p_value TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM vault.update_secret('3af1ccf0-da9d-45d5-b157-fb0c8dc4d0c6', p_value);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.internal_sync_sla_service_role_secret(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.internal_sync_sla_service_role_secret(TEXT) TO service_role;
