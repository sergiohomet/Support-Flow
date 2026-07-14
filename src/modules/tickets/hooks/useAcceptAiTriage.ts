import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import type { TicketPriority } from '../schemas'
import { parseRpcError } from '@/core/utils/parseRpcError'

interface UseAcceptAiTriageResult {
  acceptCategory: (ticketId: string, categoryId: string) => Promise<boolean>
  acceptPriority: (ticketId: string, priority: TicketPriority) => Promise<boolean>
  isAcceptingCategory: boolean
  isAcceptingPriority: boolean
  categoryError: string | null
  priorityError: string | null
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
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [priorityError, setPriorityError] = useState<string | null>(null)

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

  return {
    acceptCategory,
    acceptPriority,
    isAcceptingCategory,
    isAcceptingPriority,
    categoryError,
    priorityError,
  }
}
