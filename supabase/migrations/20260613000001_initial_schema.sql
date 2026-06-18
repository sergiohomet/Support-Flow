-- ============================================================
-- MIGRATION 001 — Initial Schema
-- SupportFlow Helpdesk
-- ============================================================

-- ============================================================
-- 1. ENUMs
-- ============================================================
CREATE TYPE public.user_role AS ENUM ('client', 'agent', 'admin');
CREATE TYPE public.ticket_status AS ENUM ('abierto', 'en_proceso', 'resuelto', 'reabierto');
CREATE TYPE public.ticket_priority AS ENUM ('baja', 'media', 'alta', 'critica');
CREATE TYPE public.notification_type AS ENUM ('status_change', 'sla_escalation');

-- ============================================================
-- 2. Tablas
-- ============================================================

-- users: espejo de auth.users con datos de perfil y rol
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  role public.user_role NOT NULL DEFAULT 'client',
  specialty VARCHAR(50),
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sla_config: 1:1 con categories
CREATE TABLE public.sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  max_resolution_hours INTEGER NOT NULL CHECK (max_resolution_hours > 0),
  escalation_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tickets: entidad central
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'abierto',
  priority public.ticket_priority NOT NULL DEFAULT 'media',
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  agent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ai_triage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ticket_comments
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ticket_status_log: auditoría inmutable
CREATE TABLE public.ticket_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  from_status public.ticket_status,
  to_status public.ticket_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Índices
-- ============================================================
CREATE INDEX idx_tickets_client_id ON public.tickets(client_id);
CREATE INDEX idx_tickets_agent_id ON public.tickets(agent_id);
CREATE INDEX idx_tickets_category_id ON public.tickets(category_id);
CREATE INDEX idx_tickets_status_created ON public.tickets(status, created_at);
CREATE INDEX idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX idx_ticket_status_log_ticket_changed ON public.ticket_status_log(ticket_id, changed_at);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

-- ============================================================
-- 4. Función helper para RLS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 5. Función y trigger: set_updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_tickets
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_sla_config
  BEFORE UPDATE ON public.sla_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. Trigger: log_status_change
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_status_log (ticket_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_status_change
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_ticket_status_change();

-- ============================================================
-- 7. Trigger: validate_agent_limit (máximo 5 tickets activos por agente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_agent_limit()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    SELECT COUNT(*) INTO active_count
    FROM public.tickets
    WHERE agent_id = NEW.agent_id
      AND status IN ('abierto', 'en_proceso', 'reabierto')
      AND id IS DISTINCT FROM NEW.id;

    IF active_count >= 5 THEN
      RAISE EXCEPTION 'agent_limit_exceeded: El agente ya tiene 5 tickets activos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_agent_limit
  BEFORE INSERT OR UPDATE OF agent_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_limit();

-- ============================================================
-- 8. Trigger: validate_agent_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_agent_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF NEW.agent_id IS NOT NULL THEN
    SELECT role INTO v_role FROM public.users WHERE id = NEW.agent_id;
    IF v_role NOT IN ('agent', 'admin') THEN
      RAISE EXCEPTION 'invalid_agent_role: El usuario asignado debe tener rol agent o admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_agent_role
  BEFORE INSERT OR UPDATE OF agent_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_role();

-- ============================================================
-- 9. Trigger: handle_new_user (auth → public.users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 10. RLS — Habilitar en todas las tablas
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. RLS Policies — users
-- ============================================================

-- Todos pueden leer usuarios (para mostrar nombres en tickets)
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT USING (true);

-- Cada usuario actualiza su propio perfil
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins pueden actualizar cualquier usuario
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- Admins insertan usuarios (para crear agentes/admins)
CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

-- ============================================================
-- 12. RLS Policies — categories
-- ============================================================
CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_admin" ON public.categories
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "categories_update_admin" ON public.categories
  FOR UPDATE USING (public.get_my_role() = 'admin');

CREATE POLICY "categories_delete_admin" ON public.categories
  FOR DELETE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 13. RLS Policies — sla_config
-- ============================================================
CREATE POLICY "sla_select_all" ON public.sla_config
  FOR SELECT USING (true);

CREATE POLICY "sla_insert_admin" ON public.sla_config
  FOR INSERT WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "sla_update_admin" ON public.sla_config
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- ============================================================
-- 14. RLS Policies — tickets
-- ============================================================

-- Clientes ven sus tickets; agentes ven todos los abiertos + los asignados; admins ven todo
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (
    client_id = auth.uid()
    OR agent_id = auth.uid()
    OR public.get_my_role() IN ('agent', 'admin')
  );

-- Solo clientes crean tickets
CREATE POLICY "tickets_insert_client" ON public.tickets
  FOR INSERT WITH CHECK (
    client_id = auth.uid()
    AND public.get_my_role() = 'client'
  );

-- Agentes y admins actualizan tickets; clientes solo pueden reabrir los suyos
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (
    public.get_my_role() IN ('agent', 'admin')
    OR (client_id = auth.uid() AND status = 'resuelto')
  );

-- ============================================================
-- 15. RLS Policies — ticket_comments
-- ============================================================

-- Pueden ver comentarios quienes están involucrados en el ticket
CREATE POLICY "comments_select" ON public.ticket_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND (
          t.client_id = auth.uid()
          OR t.agent_id = auth.uid()
          OR public.get_my_role() IN ('agent', 'admin')
        )
    )
  );

-- Pueden comentar quienes están involucrados
CREATE POLICY "comments_insert" ON public.ticket_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND (
          t.client_id = auth.uid()
          OR t.agent_id = auth.uid()
          OR public.get_my_role() IN ('agent', 'admin')
        )
    )
  );

-- ============================================================
-- 16. RLS Policies — ticket_status_log
-- ============================================================

-- Auditoría: misma visibilidad que el ticket
CREATE POLICY "status_log_select" ON public.ticket_status_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_id
        AND (
          t.client_id = auth.uid()
          OR t.agent_id = auth.uid()
          OR public.get_my_role() IN ('agent', 'admin')
        )
    )
  );

-- ============================================================
-- 17. RLS Policies — notifications
-- ============================================================

-- Cada usuario ve solo sus notificaciones
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Solo pueden marcar como leídas las propias
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
