-- ============================================================
-- MIGRATION 20260701000001 — SLA: add ticket columns
-- SupportFlow Helpdesk
--
-- Adds the two columns the SLA feature needs on tickets:
--   escalated_at        — set when a ticket breaches its SLA and
--                          gets escalated (NULL = not escalated).
--   sla_hours_snapshot   — the max_resolution_hours value copied
--                          from sla_config at ticket-creation time,
--                          so later admin edits to sla_config don't
--                          retroactively change an already-created
--                          ticket's SLA deadline.
--
-- Partial index on escalated_at IS NULL: the escalation cron job
-- (future slice) will scan only non-escalated tickets, so indexing
-- just the NULL subset keeps it small and fast.
-- ============================================================

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS sla_hours_snapshot INTEGER NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_escalated_at ON public.tickets(escalated_at)
  WHERE escalated_at IS NULL;
