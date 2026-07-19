-- ============================================================
-- MIGRATION 20260719115002 — users.category_id ON DELETE RESTRICT
-- SupportFlow Helpdesk
--
-- users_category_id_fkey era ON DELETE NO ACTION (sin regla
-- explícita). No es deferrable, así que ya bloqueaba el borrado de
-- una categoría con agentes asignados (NO ACTION y RESTRICT se
-- comportan igual para constraints no deferrables) — este cambio no
-- corrige un bug funcional, solo la deja explícita como RESTRICT
-- para que coincida con el resto del esquema (tickets.category_id ya
-- usa ON DELETE RESTRICT por el mismo motivo: no permitir borrar una
-- categoría todavía en uso).
-- ============================================================

ALTER TABLE public.users
  DROP CONSTRAINT users_category_id_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id)
  ON DELETE RESTRICT;
