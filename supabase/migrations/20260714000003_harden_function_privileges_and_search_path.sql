-- ============================================================
-- MIGRATION 20260714000003 — Function privilege + search_path hardening
-- SupportFlow Helpdesk
--
-- Two independent security-hardening passes, found via a live audit of
-- every function `anon` can currently execute (23 functions had zero
-- REVOKE ... FROM PUBLIC anywhere in the project's history) and every
-- SECURITY DEFINER function missing an explicit `search_path` (19
-- functions, flagged WARN by Supabase's security advisor as
-- `function_search_path_mutable`).
--
-- PART 1 — real auth bypass fix
-- `create_ticket` and `validate_agent_role` both gated their role check
-- with `!= 'x'` instead of `IS DISTINCT FROM 'x'`. For a caller with no
-- resolvable role (NULL — e.g. `anon`, or `get_my_role()` returning
-- NULL), `NULL != 'x'` evaluates to NULL, which is falsy in a Postgres
-- `IF`, so the RAISE EXCEPTION is silently skipped instead of firing.
-- For `create_ticket` this is a real bypass, currently only "caught" by
-- accident because `tickets.client_id` is NOT NULL and `auth.uid()` is
-- NULL for anon — the insert fails at the constraint, not at the
-- intended authorization check. `validate_agent_role` is a trigger
-- function (Postgres blocks direct RPC invocation of anything
-- `RETURNS trigger`), so it isn't reachable by anon today, but the same
-- unsafe pattern is fixed here for correctness.
--
-- PART 2 — REVOKE EXECUTE FROM PUBLIC hardening
-- Every function in the audited list gets an explicit REVOKE, even the
-- ones whose internal role check was already found to be NULL-safe
-- (all the admin_*/get_ticket_*/get_categories/get_my_role functions) —
-- defense-in-depth: no function should be reachable by `anon` at all
-- unless it's genuinely meant to be public. Business RPCs get
-- `GRANT ... TO authenticated` back; the 6 trigger-only functions
-- (RETURNS trigger) get no grant at all, since nothing should call them
-- directly — Postgres invokes them via CREATE TRIGGER regardless of
-- EXECUTE grants.
-- `rls_auto_enable` (an event-trigger function auto-provisioned by
-- Supabase, not authored in this repo) is deliberately excluded — it's
-- platform-managed, already has its own `search_path` pinned, and
-- Postgres blocks direct invocation of event-trigger functions the same
-- way it blocks regular trigger functions.
--
-- PART 3 — search_path pinning
-- A SECURITY DEFINER function with no pinned search_path resolves
-- unqualified identifiers using the CALLER's search_path, not a fixed
-- one — a malicious caller could shadow a table/function the definer
-- function relies on via an earlier schema in their own search_path,
-- causing the privileged function to silently operate on
-- attacker-controlled objects ("search_path hijacking"). Pinned to
-- `public, pg_temp` here. `create_ticket` and `validate_agent_role`
-- already get this via their PART 1 rewrite; the other 17 flagged
-- functions get it via a plain ALTER FUNCTION (no body changes needed).
-- ============================================================


-- ---------- PART 1: fix the real auth bypass ----------

CREATE OR REPLACE FUNCTION public.create_ticket(p_title text, p_description text, p_category_id uuid, p_priority ticket_priority DEFAULT 'media'::ticket_priority)
 RETURNS TABLE(id uuid, title text, status ticket_status, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'client' THEN
    RAISE EXCEPTION 'unauthorized: Solo los clientes pueden crear tickets';
  END IF;

  RETURN QUERY
  INSERT INTO public.tickets (
    title, description, category_id, priority, client_id, status, agent_id,
    sla_hours_snapshot
  )
  VALUES (
    p_title, p_description, p_category_id, p_priority, auth.uid(), 'abierto', NULL,
    (SELECT s.max_resolution_hours FROM public.sla_config s WHERE s.category_id = p_category_id)
  )
  RETURNING
    tickets.id,
    tickets.title::text,
    tickets.status,
    tickets.created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_agent_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_role public.user_role;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    SELECT role INTO v_role FROM public.users WHERE id = NEW.agent_id;
    IF v_role IS DISTINCT FROM 'agent' THEN
      RAISE EXCEPTION 'invalid_agent_role: El usuario asignado debe tener rol agent';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;


-- ---------- PART 2: REVOKE EXECUTE FROM PUBLIC hardening ----------

-- Business RPCs: REVOKE from PUBLIC, GRANT back to authenticated only.
REVOKE EXECUTE ON FUNCTION public.admin_create_category(p_name text, p_description text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_category(p_name text, p_description text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_sla_at_risk_tickets(p_limit integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_sla_at_risk_tickets(p_limit integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_sla_compliance_by_category(p_date_from timestamp with time zone, p_date_to timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_sla_compliance_by_category(p_date_from timestamp with time zone, p_date_to timestamp with time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_sla_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_sla_config() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_get_sla_dashboard(p_date_from timestamp with time zone, p_date_to timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_sla_dashboard(p_date_from timestamp with time zone, p_date_to timestamp with time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_categories() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_category_status(p_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_category_status(p_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_toggle_user_status(p_user_id uuid, p_is_active boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_status(p_user_id uuid, p_is_active boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_category(p_id uuid, p_name text, p_description text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_category(p_id uuid, p_name text, p_description text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_sla_config(p_category_id uuid, p_max_resolution_hours integer, p_escalation_enabled boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_sla_config(p_category_id uuid, p_max_resolution_hours integer, p_escalation_enabled boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_ticket(p_title text, p_description text, p_category_id uuid, p_priority ticket_priority) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ticket(p_title text, p_description text, p_category_id uuid, p_priority ticket_priority) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_categories() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_ticket_comments(p_ticket_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_comments(p_ticket_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_ticket_detail(p_ticket_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_detail(p_ticket_id uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_ticket_status_log(p_ticket_id uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_status_log(p_ticket_id uuid) TO authenticated;

-- Trigger-only functions (RETURNS trigger): REVOKE only, no grant to
-- anyone — Postgres invokes these via CREATE TRIGGER regardless of
-- EXECUTE grants, and nothing should ever call them directly as an RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_ticket_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trigger_ai_triage() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_agent_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_agent_role() FROM PUBLIC;


-- ---------- PART 3: search_path pinning for the remaining flagged functions ----------
-- (create_ticket and validate_agent_role already got this in PART 1)

ALTER FUNCTION public.accept_ai_triage_category(p_ticket_id uuid, p_category_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_ai_triage_priority(p_ticket_id uuid, p_priority public.ticket_priority) SET search_path = public, pg_temp;
ALTER FUNCTION public.add_ticket_comment(p_ticket_id uuid, p_content text) SET search_path = public, pg_temp;
ALTER FUNCTION public.assign_ticket(p_ticket_id uuid, p_agent_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.dismiss_ai_triage(p_ticket_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_agents() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_ticket_comments(p_ticket_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_ticket_detail(p_ticket_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_ticket_status_log(p_ticket_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_tickets(p_status ticket_status, p_priority ticket_priority, p_category_id uuid, p_agent_id uuid, p_page integer, p_page_size integer, p_only_unassigned boolean, p_active_only boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_ticket_status_change() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_ai_triage() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_ticket_status(p_ticket_id uuid, p_new_status public.ticket_status) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_agent_limit() SET search_path = public, pg_temp;
