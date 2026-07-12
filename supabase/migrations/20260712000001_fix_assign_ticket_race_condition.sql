-- Migration: 20260712000001_fix_assign_ticket_race_condition
-- Purpose: Close a race condition in assign_ticket() where two agents
--          could self-claim the same unassigned ticket concurrently and
--          both requests would succeed (last UPDATE wins silently).
--
-- The concurrency guard applies ONLY to the self-claim path (p_agent_id =
-- auth.uid()). Admin-driven reassignment (p_agent_id != auth.uid(), via
-- useReassignTicket.ts / ReassignTicketModal.tsx) intentionally overwrites
-- an already-assigned ticket's agent_id and must keep working unguarded —
-- no guard is added there.
--
-- All other behavior (role check, category match, assignment log insert,
-- notification-on-reassignment-only) is preserved unchanged from the
-- previous version in 20260703000008_specialty_to_category_fk.sql.

CREATE OR REPLACE FUNCTION public.assign_ticket(p_ticket_id uuid, p_agent_id uuid)
RETURNS TABLE(id uuid, agent_id uuid, status ticket_status, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_agent_id    UUID;
  v_title           TEXT;
  v_ticket_category UUID;
  v_agent_category  UUID;
  v_is_self_claim   BOOLEAN;
BEGIN
  IF public.get_my_role() NOT IN ('agent', 'admin') THEN
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

  -- Notify only the newly assigned agent, excluding self-reassignment
  IF p_agent_id != auth.uid() THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, message)
    VALUES (p_agent_id, p_ticket_id, 'reassignment', 'Se te asignó el ticket "' || v_title || '".');
  END IF;
END;
$$;
