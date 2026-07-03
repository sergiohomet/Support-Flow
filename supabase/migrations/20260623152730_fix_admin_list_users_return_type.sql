-- Backfilled 2026-07-03 from supabase_migrations.schema_migrations.statements —
-- this was applied directly via the Supabase MCP tool with no local file.
-- Superseded by 20260703000004_backfill_admin_list_users_text_casts.sql and
-- later 20260703000008_specialty_to_category_fk.sql.

-- Fix: explicit casts on all returned columns to match declared RETURNS TABLE types
-- PostgreSQL raises "structure of query does not match function result type"
-- when varchar/character varying columns are returned as text without explicit cast.

create or replace function public.admin_list_users(
  p_role      public.user_role default null,
  p_search    text             default null,
  p_is_active boolean          default null,
  p_page      int              default 1,
  p_page_size int              default 20
)
returns table (
  id          uuid,
  email       text,
  full_name   text,
  avatar_url  text,
  role        public.user_role,
  specialty   text,
  is_active   boolean,
  created_at  timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
begin
  select u.role into v_caller_role
  from public.users u
  where u.id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    return;
  end if;

  return query
  select
    u.id::uuid,
    au.email::text,
    u.full_name::text,
    u.avatar_url::text,
    u.role,
    u.specialty::text,
    u.is_active::boolean,
    u.created_at::timestamptz,
    count(*) over ()::bigint as total_count
  from public.users u
  join auth.users au on au.id = u.id
  where
    (p_role is null or u.role = p_role)
    and (p_is_active is null or u.is_active = p_is_active)
    and (
      p_search is null
      or u.full_name ilike '%' || p_search || '%'
      or au.email ilike '%' || p_search || '%'
    )
  order by u.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
end;
$$;

grant execute on function public.admin_list_users(public.user_role, text, boolean, int, int)
  to authenticated;
