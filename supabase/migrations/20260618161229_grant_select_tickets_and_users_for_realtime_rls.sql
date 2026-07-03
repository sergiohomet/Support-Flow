-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.

-- Allow authenticated role to run SELECT on tickets so Realtime can evaluate
-- the ticket_comments SELECT policy (which sub-queries tickets to check ownership).
-- RLS on tickets still filters rows correctly — agents/admins see all, clients see their own.
GRANT SELECT ON public.tickets TO authenticated;

-- Also grant users for any future realtime subscriptions that reference users in RLS policies.
GRANT SELECT ON public.users TO authenticated;
