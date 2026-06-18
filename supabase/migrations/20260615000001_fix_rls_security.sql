-- Migration: 20260615000001_fix_rls_security
-- Purpose: Fix 3 RLS security bugs — role escalation on users, agent_id pre-assignment
--          on ticket insert, and unrestricted field edits on ticket reopen by clients.

-- ============================================================
-- TABLE: public.users
-- ============================================================

-- Bug 1: users_update_own allowed clients to escalate role or flip is_active.
-- Fix: WITH CHECK now asserts role and is_active are unchanged from current row.

DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.users WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM public.users WHERE id = auth.uid())
  );

-- ============================================================
-- TABLE: public.tickets
-- ============================================================

-- Bug 2: tickets_insert_client allowed clients to pre-assign agent_id.
-- Fix: Add AND agent_id IS NULL to WITH CHECK.

DROP POLICY IF EXISTS "tickets_insert_client" ON public.tickets;

CREATE POLICY "tickets_insert_client" ON public.tickets
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND public.get_my_role() = 'client'
    AND agent_id IS NULL
  );

-- Bug 3: tickets_update had no WITH CHECK, letting clients edit any field on reopen.
-- Fix: Add WITH CHECK that restricts clients to only changing status to 'reabierto',
--      while leaving all other fields identical to the current persisted row.
--      Agents and admins retain unrestricted field access.

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (
    public.get_my_role() IN ('agent', 'admin')
    OR (client_id = auth.uid() AND status = 'resuelto')
  )
  WITH CHECK (
    public.get_my_role() IN ('agent', 'admin')
    OR (
      client_id = auth.uid()
      AND status = 'reabierto'
      AND title       = (SELECT t.title       FROM public.tickets t WHERE t.id = tickets.id)
      AND description = (SELECT t.description FROM public.tickets t WHERE t.id = tickets.id)
      AND priority    = (SELECT t.priority    FROM public.tickets t WHERE t.id = tickets.id)
      AND category_id IS NOT DISTINCT FROM (SELECT t.category_id FROM public.tickets t WHERE t.id = tickets.id)
      AND agent_id    IS NOT DISTINCT FROM (SELECT t.agent_id    FROM public.tickets t WHERE t.id = tickets.id)
    )
  );

-- ============================================================
-- TABLE: public.users (privacy fix)
-- ============================================================

-- Bug 4: users_select_all exposed all user data to all authenticated users.
-- Fix: clients see only their own row + agents assigned to their tickets.
--      Agents and admins see all users.

DROP POLICY IF EXISTS "users_select_all" ON public.users;

CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR public.get_my_role() IN ('agent', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.agent_id = users.id
        AND t.client_id = auth.uid()
    )
  );
