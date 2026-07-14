-- ============================================================
-- MIGRATION 20260714000004 — Add 'new_ticket' notification type
-- SupportFlow Helpdesk
--
-- New enum value only, in its own migration/transaction. Postgres
-- forbids using a newly-added enum value in the same transaction that
-- adds it, so this must commit before any migration/function
-- references 'new_ticket' by name (see 20260702000001 for the same
-- isolation pattern used when 'reassignment'/'new_comment' were added).
-- ============================================================

ALTER TYPE public.notification_type ADD VALUE 'new_ticket';
