-- ============================================================
-- MIGRATION 002 — Seed: Categorías y SLA
-- SupportFlow Helpdesk
-- ============================================================

-- Categorías base
INSERT INTO public.categories (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Hardware', 'Problemas con equipos físicos: computadoras, impresoras, periféricos'),
  ('22222222-2222-2222-2222-222222222222', 'Software', 'Problemas con aplicaciones, sistemas operativos o configuraciones'),
  ('33333333-3333-3333-3333-333333333333', 'Redes', 'Problemas de conectividad, red local, internet o VPN');

-- SLA config: Hardware 48h, Software 24h, Redes 8h
INSERT INTO public.sla_config (category_id, max_resolution_hours, escalation_enabled) VALUES
  ('11111111-1111-1111-1111-111111111111', 48, true),
  ('22222222-2222-2222-2222-222222222222', 24, true),
  ('33333333-3333-3333-3333-333333333333', 8,  true);
