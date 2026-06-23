import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import type { AdminUser, UserRole } from '../schemas'

interface ListUsersParams {
  search?: string | null
  role?: UserRole | null
  isActive?: boolean | null
  page?: number
  pageSize?: number
}

interface UseListUsersResult {
  users: AdminUser[]
  totalCount: number
  isFetching: boolean
  error: string | null
  fetch: (params: ListUsersParams) => Promise<void>
}

export function useListUsers(): UseListUsersResult {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = async (params: ListUsersParams): Promise<void> => {
    setIsFetching(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_users', {
        p_search: params.search ?? null,
        p_page: params.page ?? 1,
        p_page_size: params.pageSize ?? 10,
        ...(params.role != null ? { p_role: params.role } : {}),
        ...(params.isActive != null ? { p_is_active: params.isActive } : {}),
      })

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (data as Array<Record<string, unknown>>) ?? []

      setTotalCount(rows.length > 0 ? (rows[0].total_count as number) : 0)

      setUsers(
        rows.map((row) => ({
          id: row.id as string,
          email: row.email as string,
          fullName: row.full_name as string,
          avatarUrl: row.avatar_url as string | null,
          role: row.role as AdminUser['role'],
          specialty: row.specialty as string | null,
          isActive: row.is_active as boolean,
          createdAt: row.created_at as string,
        }))
      )
    } finally {
      setIsFetching(false)
    }
  }

  return { users, totalCount, isFetching, error, fetch }
}
