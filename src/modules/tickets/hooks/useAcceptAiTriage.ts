import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { TicketPriority } from '../schemas'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseAcceptAiTriageResult {
  acceptCategory: (ticketId: string, categoryId: string) => Promise<boolean>
  acceptPriority: (ticketId: string, priority: TicketPriority) => Promise<boolean>
  dismissTriage: (ticketId: string) => Promise<boolean>
  isAcceptingCategory: boolean
  isAcceptingPriority: boolean
  isDismissing: boolean
  categoryError: string | null
  priorityError: string | null
  dismissError: string | null
}

// Owns both ai_triage "accept" actions (accept_ai_triage_category and
// accept_ai_triage_priority). They are independent actions — a caller could
// plausibly trigger both from the same suggestion card in quick succession
// (e.g. "accept everything") — so loading/error state is tracked per-action
// rather than as a single shared isAccepting/error pair. A shared pair would
// make one action's in-flight state block/overwrite the other's, and would
// let a later success silently clear an earlier, unrelated error. Whether
// the UI (PR5) surfaces both flags separately or combines them into one
// "isAccepting" boolean is a presentation decision left to that layer.
export function useAcceptAiTriage(): UseAcceptAiTriageResult {
  const [isAcceptingCategory, setIsAcceptingCategory] = useState(false)
  const [isAcceptingPriority, setIsAcceptingPriority] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [priorityError, setPriorityError] = useState<string | null>(null)
  const [dismissError, setDismissError] = useState<string | null>(null)

  const acceptCategory = async (ticketId: string, categoryId: string): Promise<boolean> => {
    setIsAcceptingCategory(true)
    setCategoryError(null)

    try {
      const { error: rpcError } = await supabase.rpc('accept_ai_triage_category', {
        p_ticket_id: ticketId,
        p_category_id: categoryId,
      })

      if (rpcError) {
        setCategoryError(parseRpcError(rpcError.message))
        return false
      }

      return true
    } finally {
      setIsAcceptingCategory(false)
    }
  }

  const acceptPriority = async (ticketId: string, priority: TicketPriority): Promise<boolean> => {
    setIsAcceptingPriority(true)
    setPriorityError(null)

    try {
      const { error: rpcError } = await supabase.rpc('accept_ai_triage_priority', {
        p_ticket_id: ticketId,
        p_priority: priority,
      })

      if (rpcError) {
        setPriorityError(parseRpcError(rpcError.message))
        return false
      }

      return true
    } finally {
      setIsAcceptingPriority(false)
    }
  }

  // Permanently discards the suggestion (agent ignored it, or already used
  // it as the basis for their reply) — the ai_triage suggestion is
  // generated once from the ticket's original description and is never
  // regenerated from later comments, so once acted on it must not
  // reappear, including after a reload. Sets tickets.ai_triage back to
  // null server-side; the panel's own render-gate ("show only when
  // ai_triage is non-null") makes that sufficient to hide it for good.
  const dismissTriage = async (ticketId: string): Promise<boolean> => {
    setIsDismissing(true)
    setDismissError(null)

    try {
      const { error: rpcError } = await supabase.rpc('dismiss_ai_triage', {
        p_ticket_id: ticketId,
      })

      if (rpcError) {
        setDismissError(parseRpcError(rpcError.message))
        return false
      }

      return true
    } finally {
      setIsDismissing(false)
    }
  }

  return {
    acceptCategory,
    acceptPriority,
    dismissTriage,
    isAcceptingCategory,
    isAcceptingPriority,
    isDismissing,
    categoryError,
    priorityError,
    dismissError,
  }
}
