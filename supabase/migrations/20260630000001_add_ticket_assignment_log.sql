-- ============================================================
-- MIGRATION 20260630000001 — Ticket Assignment Log
-- SupportFlow Helpdesk
--
-- Agrega la tabla ticket_assignment_log para registrar cada
-- reasignación de agente en un ticket. El registro se escribe
-- dentro del RPC assign_ticket (SECURITY DEFINER) donde
-- auth.uid() está disponible. No se usan triggers porque los
-- triggers de PostgreSQL corren como superuser sin contexto JWT.
--
-- Además, reemplaza el RPC assign_ticket para capturar
-- v_old_agent_id antes del UPDATE e insertar en el log.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabla ticket_assignment_log
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_assignment_log (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id     UUID        NOT NULL REFERENCES public.tickets(id)  ON DELETE CASCADE,
  from_agent_id UUID                 REFERENCES public.users(id)    ON DELETE SET NULL,
  to_agent_id   UUID        NOT NULL REFERENCES public.users(id)    ON DELETE RESTRICT,
  changed_by    UUID        NOT NULL REFERENCES public.users(id)    ON DELETE RESTRICT,
  changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_assignment_log_ticket_id_idx
  ON public.ticket_assignment_log(ticket_id);

CREATE INDEX IF NOT EXISTS ticket_assignment_log_changed_at_idx
  ON public.ticket_assignment_log(changed_at DESC);

-- RLS: agentes y admins pueden leer; nadie puede insertar directo (solo via RPC)
ALTER TABLE public.ticket_assignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_admins_read_assignment_log"
  ON public.ticket_assignment_log
  FOR SELECT
  TO authenticated
  USING (public.get_my_role() IN ('agent', 'admin'));


-- ------------------------------------------------------------
-- 2. Reemplazar assign_ticket para registrar en bitácora
--    Invariante: si validate_agent_limit o validate_agent_role
--    lanzan excepción, el UPDATE aborta y el INSERT en el log
--    nunca ocurre (transacción implícita compartida).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_ticket(
  p_ticket_id UUID,
  p_agent_id  UUID
)
RETURNS TABLE (
  id         UUID,
  agent_id   UUID,
  status     public.ticket_status,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_agent_id UUID;
BEGIN
  IF public.get_my_role() NOT IN ('agent', 'admin') THEN
    RAISE EXCEPTION 'unauthorized: Solo agentes y admins pueden asignar tickets';
  END IF;

  -- Capturar agente anterior antes del UPDATE
  SELECT t.agent_id INTO v_old_agent_id
  FROM public.tickets t
  WHERE t.id = p_ticket_id;

  -- Triggers fire here:
  --   validate_agent_limit: raises 'agent_limit_exceeded: ...' if >= 5 active
  --   validate_agent_role:  raises 'invalid_agent_role: ...' if user is not agent/admin
  -- Both exceptions propagate untouched — do NOT add EXCEPTION block.
  RETURN QUERY
  UPDATE public.tickets t
  SET agent_id = p_agent_id,
      status   = 'en_proceso'
  WHERE t.id = p_ticket_id
  RETURNING
    t.id,
    t.agent_id,
    t.status,
    t.updated_at;

  -- Registrar en bitácora (auth.uid() disponible en SECURITY DEFINER)
  -- Solo se ejecuta si el UPDATE no lanzó excepción
  INSERT INTO public.ticket_assignment_log
    (ticket_id, from_agent_id, to_agent_id, changed_by, changed_at)
  VALUES
    (p_ticket_id, v_old_agent_id, p_agent_id, auth.uid(), now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_ticket(UUID, UUID) TO authenticated;
