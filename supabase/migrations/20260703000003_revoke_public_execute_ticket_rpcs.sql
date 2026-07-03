-- ============================================================
-- MIGRATION 20260703000003 — Revoke PUBLIC execute on ticket RPCs
-- SupportFlow Helpdesk
--
-- Postgres grants EXECUTE to PUBLIC by default on every new function.
-- These 4 pre-existing ticket RPCs were never explicitly locked down
-- (unlike run_sla_escalation_check and the 3 notification RPCs, which
-- already got this treatment). Confirmed low actual risk via
-- get_advisors — all 4 self-gate through internal role/ownership
-- checks — but closing the gap for defense in depth and consistency
-- with the rest of the codebase.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.assign_ticket(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_ticket_status(UUID, public.ticket_status) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_ticket_comment(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unassign_ticket(UUID) FROM PUBLIC;
