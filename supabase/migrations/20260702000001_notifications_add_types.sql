-- ============================================================
-- MIGRATION 20260702000001 — Notification types: reassignment, new_comment
-- SupportFlow Helpdesk
--
-- Adds the two notification_type enum values required by P14
-- (Notifications module). Split into its own migration (not combined
-- with the producer wiring in 20260702000002) because
-- ALTER TYPE ... ADD VALUE must commit before the new label can be
-- referenced by name in PL/pgSQL function bodies compiled in a later
-- transaction. This is the first enum alteration in this project's
-- history — no other migration touches an existing ENUM's value set.
-- ============================================================

ALTER TYPE public.notification_type ADD VALUE 'reassignment';
ALTER TYPE public.notification_type ADD VALUE 'new_comment';
