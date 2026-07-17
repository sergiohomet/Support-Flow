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

// Maneja las dos acciones de "aceptar" de ai_triage (accept_ai_triage_category y
// accept_ai_triage_priority). Son acciones independientes — quien las invoca podría
// plausiblemente disparar ambas desde la misma tarjeta de sugerencia en rápida sucesión
// (por ejemplo, "aceptar todo") — por eso el estado de carga/error se rastrea por acción
// en lugar de usar un único par compartido isAccepting/error. Un par compartido
// haría que el estado en curso de una acción bloquee/sobrescriba el de la otra, y
// permitiría que un éxito posterior borre silenciosamente un error anterior no relacionado. Si
// la UI (PR5) muestra ambos flags por separado o los combina en un único booleano
// "isAccepting" es una decisión de presentación que queda para esa capa.
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

  // Descarta la sugerencia de forma permanente (el agente la ignoró, o ya la usó
  // como base para su respuesta) — la sugerencia de ai_triage se
  // genera una sola vez a partir de la descripción original del ticket y nunca se
  // regenera a partir de comentarios posteriores, así que una vez que se actuó sobre ella no debe
  // volver a aparecer, ni siquiera después de recargar la página. Vuelve a poner tickets.ai_triage en
  // null del lado del servidor; el propio filtro de renderizado del panel ("mostrar solo cuando
  // ai_triage no es null") es suficiente para ocultarlo definitivamente.
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
