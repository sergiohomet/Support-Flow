-- ============================================================
-- MIGRATION 20260713000003 — ai-triage AFTER INSERT trigger
-- SupportFlow Helpdesk
--
-- PR3 of the "ai-triage" change. Adds an AFTER INSERT trigger on
-- public.tickets that fires the ai-triage Edge Function (added in PR2)
-- for every newly created ticket, via net.http_post — the same
-- pg_net-based async HTTP call pattern established by migration
-- 20260701000008 (sla_cron_schedule) for the SLA escalation cron job,
-- adapted here from a time-based cron job to a row-level trigger.
--
-- pg_cron/pg_net were already enabled by migration 20260701000007; no
-- extension setup needed here.
--
-- SECRET HANDLING: identical discipline to 20260701000008 — the bearer
-- token sent to the ai-triage function is NEVER stored in this file (or
-- any committed file). It lives encrypted in Supabase Vault under the
-- name 'ai_triage_trigger_secret', created out-of-band per the steps
-- already documented in migration 20260713000002
-- (ai_triage_trigger_secret_vault_doc). This migration only references
-- that secret BY NAME via the vault.decrypted_secrets view, resolved at
-- execution time inside the trigger function body — the plaintext
-- value never touches source control.
--
-- FIRE-AND-FORGET / NON-BLOCKING: net.http_post (pg_net) queues the HTTP
-- request on a background worker and returns immediately without
-- waiting for a response — this is true regardless of whether it's
-- called from a pg_cron job body (20260701000008) or, as here, from a
-- row-level trigger function; nothing about pg_net's queuing behavior
-- is context-specific. The entire net.http_post call (including the
-- Vault secret lookup) is additionally wrapped in a BEGIN/EXCEPTION
-- block so that ANY failure here — a missing/null Vault secret, pg_net
-- misbehaving, etc. — is caught and swallowed (logged via RAISE WARNING
-- only) rather than propagated as an exception. This is a best-effort
-- side notification, not a data-integrity requirement: a ticket must
-- always be insertable even if the entire ai-triage pipeline is
-- undeployed or broken.
--
-- Idempotent: drops any pre-existing trigger with the same name before
-- creating it, so re-running this migration doesn't error or create
-- duplicate triggers.
--
-- STILL TO DO, LIVE, OUTSIDE OF GIT (see PR description — these are the
-- same steps already documented in migration 20260713000002 and are not
-- duplicated here beyond this pointer, so the two migrations don't
-- drift out of sync):
--   1. Create the 'ai_triage_trigger_secret' Vault secret (step 2 of
--      migration 20260713000002's TODO list).
--   2. Set the AI_TRIAGE_TRIGGER_SECRET and OPENROUTER_API_KEY Edge
--      Function secrets and deploy the ai-triage function (steps 3-5 of
--      the same TODO list).
--   3. Only once the above is confirmed live and working should this
--      migration (20260713000003) itself be applied to the live DB —
--      see the PR description for why apply order matters here.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_ai_triage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'https://uvlucodcayfuzfqvpqan.supabase.co/functions/v1/ai-triage',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ai_triage_trigger_secret'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('ticketId', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Swallow ANY failure (missing/null Vault secret, pg_net error,
    -- etc.) — ticket creation must never fail or roll back because the
    -- best-effort ai-triage notification could not be sent.
    RAISE WARNING 'trigger_ai_triage: failed to notify ai-triage for ticket %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_triage_after_insert ON public.tickets;

CREATE TRIGGER ai_triage_after_insert
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_ai_triage();
