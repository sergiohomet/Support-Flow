import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import type { AdminUser, UserRole } from '../schemas'

interface UseListUsersParams {
  search: string | null
  role: UserRole | null
  isActive: boolean | null
  page: number
  pageSize: number
  enabled: boolean
}

interface UseListUsersResult {
  users: AdminUser[]
  totalCount: number
  isFetching: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  users: AdminUser[]
  totalCount: number
  error: string | null
}

function mapUserRow(row: Record<string, unknown>): AdminUser {
  return {
    id: row.id as string,
    email: row.email as string,
    fullName: row.full_name as string,
    avatarUrl: row.avatar_url as string | null,
    role: row.role as AdminUser['role'],
    categoryId: row.category_id as string | null,
    categoryName: row.category_name as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  }
}

async function fetchUsers(params: Omit<UseListUsersParams, 'enabled'>): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('admin_list_users', {
    p_page: params.page,
    p_page_size: params.pageSize,
    ...(params.search != null ? { p_search: params.search } : {}),
    ...(params.role != null ? { p_role: params.role } : {}),
    ...(params.isActive != null ? { p_is_active: params.isActive } : {}),
  })

  if (rpcError) {
    return { users: [], totalCount: 0, error: parseRpcError(rpcError.message) }
  }

  const rows = (data as Array<Record<string, unknown>>) ?? []
  return {
    users: rows.map(mapUserRow),
    totalCount: rows.length > 0 ? (rows[0].total_count as number) : 0,
    error: null,
  }
}

// Auto-fetches on [search, role, isActive, page, pageSize] change, gated by
// `enabled` (the page only wants to query once a search/filter is active —
// see UsersPage's hasActiveFilters). Mirrors the reports/sla hooks' shape:
// the RPC call + mapping lives in a plain function outside the hook, and the
// effect wraps state updates in a locally-declared async runner, because
// react-hooks/set-state-in-effect flags any effect whose top level calls an
// outer function (or sets state directly) that updates state.
export function useListUsers(params: UseListUsersParams): UseListUsersResult {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { search, role, isActive, page, pageSize, enabled } = params

  const refetch = async (): Promise<void> => {
    setIsFetching(true)
    setError(null)
    try {
      const result = await fetchUsers({ search, role, isActive, page, pageSize })
      setUsers(result.users)
      setTotalCount(result.totalCount)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function run(): Promise<void> {
      setIsFetching(true)
      setError(null)
      try {
        const result = await fetchUsers({ search, role, isActive, page, pageSize })
        if (cancelled) return
        setUsers(result.users)
        setTotalCount(result.totalCount)
        setError(result.error)
      } catch (err) {
        if (!cancelled) setError(parseRpcError(err instanceof Error ? err.message : String(err)))
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [search, role, isActive, page, pageSize, enabled])

  return { users, totalCount, isFetching, error, refetch }
}
