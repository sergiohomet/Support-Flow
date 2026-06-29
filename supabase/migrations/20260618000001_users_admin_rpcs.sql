-- Migration: 20260618000001_users_admin_rpcs.sql
-- Description: Add admin RPCs for user management (list, update role, toggle status)
-- Note: avatar_url column already exists in public.users (verified in database.types.ts)

-- ============================================================
-- RPC: admin_list_users
-- Returns paginated user list joining auth.users + public.users
-- Only callable by admin role; returns empty set for non-admins
-- ============================================================
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
  -- Verify caller is admin
  select u.role into v_caller_role
  from public.users u
  where u.id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    return;
  end if;

  return query
  select
    u.id,
    au.email::text,
    u.full_name,
    u.avatar_url,
    u.role,
    u.specialty,
    u.is_active,
    u.created_at,
    count(*) over () as total_count
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

-- Grant execute to authenticated users (RPC itself enforces admin check)
grant execute on function public.admin_list_users(public.user_role, text, boolean, int, int)
  to authenticated;

-- ============================================================
-- RPC: admin_update_user_role
-- Updates a user's role. Raises if caller tries to change own role.
-- ============================================================
create or replace function public.admin_update_user_role(
  p_user_id  uuid,
  p_new_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
begin
  -- Verify caller is admin
  select u.role into v_caller_role
  from public.users u
  where u.id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'unauthorized: Only admins can update user roles';
  end if;

  -- Self-demotion guard
  if p_user_id = auth.uid() then
    raise exception 'unauthorized: Cannot change your own role';
  end if;

  update public.users
  set role = p_new_role
  where id = p_user_id;

  if not found then
    raise exception 'not_found: User not found';
  end if;
end;
$$;

grant execute on function public.admin_update_user_role(uuid, public.user_role)
  to authenticated;

-- ============================================================
-- RPC: admin_toggle_user_status
-- Sets a user's is_active flag. Raises if caller tries to disable themselves.
-- ============================================================
create or replace function public.admin_toggle_user_status(
  p_user_id  uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.user_role;
begin
  -- Verify caller is admin
  select u.role into v_caller_role
  from public.users u
  where u.id = auth.uid();

  if v_caller_role is distinct from 'admin' then
    raise exception 'unauthorized: Only admins can toggle user status';
  end if;

  -- Self-disable guard
  if p_user_id = auth.uid() then
    raise exception 'unauthorized: Cannot change your own active status';
  end if;

  update public.users
  set is_active = p_is_active
  where id = p_user_id;

  if not found then
    raise exception 'not_found: User not found';
  end if;
end;
$$;

grant execute on function public.admin_toggle_user_status(uuid, boolean)
  to authenticated;
