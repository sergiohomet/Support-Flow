import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { Agent } from '../schemas'

interface UseAgentListResult {
  isLoadingAgents: boolean
  error: string | null
  loadAgents: () => Promise<void>
}

export function useAgentList(): UseAgentListResult {
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAgents = useStore((s) => s.setAgents)

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

  return { isLoadingAgents, error, loadAgents }
}
