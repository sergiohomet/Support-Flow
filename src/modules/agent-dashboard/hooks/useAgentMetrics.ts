import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface AgentMetrics {
  assignedCount: number
  resolvedThisMonth: number
  slaCompliancePct: number
  avgResolutionHours: number
}

interface UseAgentMetricsResult {
  data: AgentMetrics | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface FetchResult {
  data: AgentMetrics | null
  error: string | null
}

async function fetchAgentMetrics(agentId: string): Promise<FetchResult> {
  const { data: rpcData, error: rpcError } = await supabase.rpc('agent_get_my_metrics', {
    p_agent_id: agentId,
  })

  if (rpcError) {
    return { data: null, error: parseRpcError(rpcError.message) }
  }

  const rows = (rpcData as Array<Record<string, unknown>>) ?? []
  const row = rows[0]

  if (!row) {
    return {
      data: {
        assignedCount: 0,
        resolvedThisMonth: 0,
        slaCompliancePct: 0,
        avgResolutionHours: 0,
      },
      error: null,
    }
  }

  return {
    data: {
      assignedCount: Number(row.assigned_count ?? 0),
      resolvedThisMonth: Number(row.resolved_this_month ?? 0),
      slaCompliancePct: Number(row.sla_compliance_pct ?? 0),
      avgResolutionHours: Number(row.avg_resolution_hours ?? 0),
    },
    error: null,
  }
}

export function useAgentMetrics(agentId: string | null): UseAgentMetricsResult {
  const [data, setData] = useState<AgentMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetchRef = useRef<() => Promise<void>>(undefined)

  const refetch = async (): Promise<void> => {
    if (!agentId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchAgentMetrics(agentId)
      setData(result.data)
      setError(result.error)
    } catch (err) {
      setError(parseRpcError(err instanceof Error ? err.message : String(err)))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!agentId) return
    const currentAgentId = agentId

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoading(true)
      setError(null)
      try {
        const result = await fetchAgentMetrics(currentAgentId)
        if (cancelled) return
        setData(result.data)
        setError(result.error)
      } catch (err) {
        if (!cancelled) setError(parseRpcError(err instanceof Error ? err.message : String(err)))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [agentId])

  useEffect(() => {
    refetchRef.current = refetch
  })

  useEffect(() => {
    if (!agentId) return

    const channel = supabase
      .channel(`agent-metrics-${agentId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        () => {
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        () => {
          void refetchRef.current?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_status_log' },
        () => {
          void refetchRef.current?.()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [agentId])

  return { data, isLoading, error, refetch }
}
