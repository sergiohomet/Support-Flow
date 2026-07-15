-- ============================================================
-- MIGRATION 20260715000001 — fix auth bugs in assign_ticket / unassign_ticket
-- SupportFlow Helpdesk
--
-- Found in a full-codebase security audit (2026-07-15).
--
-- unassign_ticket (BLOCKER, actively exploitable): checked the caller's
-- role against auth.users.raw_user_meta_data->>'role' instead of
-- public.users.role. raw_user_meta_data is the Supabase Auth
-- "user_metadata" field, which any authenticated user can set on
-- themselves via supabase.auth.updateUser({ data: { role: 'admin' } })
-- — it is NOT the same as app_metadata (service-role-only). Since this
-- function is GRANTed to `authenticated` (any logged-in role, not just
-- agent/admin), a plain client could self-elevate their JWT metadata
-- and successfully call this RPC to unassign any ticket in the system,
-- bypassing the real role stored in public.users entirely. Fixed to
-- use public.get_my_role() — the same authoritative primitive every
-- other RPC in this project checks against — with a NULL-safe
-- IS DISTINCT FROM check instead of NOT IN.
--
-- assign_ticket (CRITICAL, latent): already used public.get_my_role(),
-- but with `NOT IN ('agent', 'admin')` — NULL-unsafe. For a caller
-- with no resolvable role (get_my_role() returns NULL), `NULL NOT IN
-- (...)` evaluates to NULL, which is falsy in a Postgres IF, silently
-- skipping the RAISE. This is the exact bug class the 2026-07-14
-- security-hardening migration fixed in create_ticket/validate_agent_role,
-- but assign_ticket wasn't in that audit's list and still had the
-- unsafe pattern. Fixed to the same IS DISTINCT FROM pattern used
-- elsewhere (dismiss_ai_triage, admin_* RPCs).
--
-- Both functions also get search_path = public, pg_temp pinned
-- (unassign_ticket was missing pg_temp; assign_ticket already had it)
-- and unassign_ticket's error message translated to Spanish to match
-- assign_ticket's sibling message.
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_ticket(p_ticket_id uuid, p_agent_id uuid)
 RETURNS TABLE(id uuid, agent_id uuid, status ticket_status, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_old_agent_id    UUID;
  v_title           TEXT;
  v_ticket_category UUID;
  v_agent_category  UUID;
  v_is_self_claim   BOOLEAN;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'agent' AND public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden asignar tickets';
  END IF;

  v_is_self_claim := (p_agent_id = auth.uid());

  SELECT t.agent_id, t.title, t.category_id INTO v_old_agent_id, v_title, v_ticket_category
  FROM public.tickets t
  WHERE t.id = p_ticket_id;

  SELECT u.category_id INTO v_agent_category
  FROM public.users u
  WHERE u.id = p_agent_id AND u.role = 'agent';

  IF v_agent_category IS DISTINCT FROM v_ticket_category THEN
    RAISE EXCEPTION 'category_mismatch: El agente no tiene la especialidad requerida para este ticket';
  END IF;

  RETURN QUERY
  UPDATE public.tickets t
  SET agent_id = p_agent_id,
      status   = 'en_proceso'
  WHERE t.id = p_ticket_id
    AND (NOT v_is_self_claim OR t.agent_id IS NULL)
  RETURNING
    t.id,
    t.agent_id,
    t.status,
    t.updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_assigned: Este ticket ya fue tomado por otro agente';
  END IF;

  INSERT INTO public.ticket_assignment_log
    (ticket_id, from_agent_id, to_agent_id, changed_by, changed_at)
  VALUES
    (p_ticket_id, v_old_agent_id, p_agent_id, auth.uid(), now());

  IF p_agent_id != auth.uid() THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (p_agent_id, p_ticket_id, 'reassignment', 'Se te asignó el ticket "' || v_title || '".');
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.unassign_ticket(
  p_ticket_id UUID
)
RETURNS TABLE (
  id         UUID,
  agent_id   UUID,
  status     public.ticket_status,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'agent' AND public.get_my_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden devolver tickets al pool';
  END IF;

  RETURN QUERY
  UPDATE public.tickets
  SET
    agent_id   = NULL,
    status     = 'abierto',
    updated_at = NOW()
  WHERE tickets.id = p_ticket_id
  RETURNING tickets.id, tickets.agent_id, tickets.status, tickets.updated_at;
END;
$$;
