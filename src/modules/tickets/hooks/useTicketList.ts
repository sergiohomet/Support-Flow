import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { TicketListItem, Category, Agent } from '../schemas'

interface UseTicketListResult {
  isFetching: boolean
  isLoadingCategories: boolean
  isLoadingAgents: boolean
  error: string | null
  fetch: () => Promise<void>
  loadCategories: () => Promise<void>
  loadAgents: () => Promise<void>
}

export function useTicketList(): UseTicketListResult {
  const [isFetching, setIsFetching] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setTickets = useStore((s) => s.setTickets)
  const setCategories = useStore((s) => s.setCategories)
  const setAgents = useStore((s) => s.setAgents)

  const fetch = async (): Promise<void> => {
    setIsFetching(true)
    setError(null)

    try {
      const filters = useStore.getState().filters
      const { data, error: rpcError } = await supabase.rpc('get_tickets', {
        p_status: filters.status ?? undefined,
        p_priority: filters.priority ?? undefined,
        p_category_id: filters.categoryId ?? undefined,
        p_agent_id: filters.agentId ?? undefined,
        p_page: filters.page,
        p_page_size: filters.pageSize,
      })

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      const mapped: TicketListItem[] = (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        priority: row.priority,
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryIsActive: row.category_is_active,
        clientId: row.client_id,
        clientFullName: row.client_full_name,
        agentId: row.agent_id ?? null,
        agentFullName: row.agent_full_name ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        commentCount: row.comment_count,
      }))

      const totalCount: number = (data as Array<{ total_count?: number }>)?.[0]?.total_count ?? 0
      setTickets(mapped, totalCount)
    } finally {
      setIsFetching(false)
    }
  }

  const loadCategories = async (): Promise<void> => {
    if (useStore.getState().categories.length > 0) return

    setIsLoadingCategories(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_categories')

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      const mapped: Category[] = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? null,
      }))

      setCategories(mapped)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadAgents = async (): Promise<void> => {
    if (useStore.getState().agents.length > 0) return

    setIsLoadingAgents(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_agents')

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      const mapped: Agent[] = (data ?? []).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        categoryId: row.category_id ?? null,
        categoryName: row.category_name ?? null,
        activeTicketCount: row.active_ticket_count,
      }))

      setAgents(mapped)
    } finally {
      setIsLoadingAgents(false)
    }
  }

  return { isFetching, isLoadingCategories, isLoadingAgents, error, fetch, loadCategories, loadAgents }
}
