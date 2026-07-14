import { useState } from 'react'
import type { AiTriage, TicketPriority } from '@/modules/tickets/schemas'
import { PriorityBadge } from '@/ui/PriorityBadge'

interface AITriagePanelProps {
  aiTriage: AiTriage
  currentCategoryId: string
  currentPriority: TicketPriority
  categoryName: string | null
  onAcceptCategory: () => void
  onAcceptPriority: () => void
  onUseAsResponse: () => void
  isAcceptingCategory: boolean
  isAcceptingPriority: boolean
}

// Pure presentational panel for the ai_triage suggestion surfaced on the
// ticket detail page. Owns zero Supabase calls — accept/use-as-response
// intents are reported upward via callbacks; TicketDetailPage (composition
// root) wires them to useAcceptAiTriage/useTicketDetail.
//
// Judgment call (not spec-mandated either way): when the suggested
// category/priority already matches the ticket's current value, the
// "Aceptar" action for that section is hidden rather than shown-disabled —
// there is nothing to accept, and a disabled button in that state reads as
// a bug rather than a no-op, so hiding is the less confusing choice.
export function AITriagePanel({
  aiTriage,
  currentCategoryId,
  currentPriority,
  categoryName,
  onAcceptCategory,
  onAcceptPriority,
  onUseAsResponse,
  isAcceptingCategory,
  isAcceptingPriority,
}: AITriagePanelProps): React.JSX.Element {
  const [isResponseDismissed, setIsResponseDismissed] = useState(false)

  const categoryMatchesCurrent = aiTriage.suggestedCategoryId === currentCategoryId
  const priorityMatchesCurrent = aiTriage.suggestedPriority === currentPriority

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-1.5">
          <span className="material-icons text-[18px] text-blue-500" aria-hidden="true">
            auto_awesome
          </span>
          Sugerencias IA
        </h3>
        {aiTriage.confidence !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-medium">
            <span className="material-icons text-[14px]" aria-hidden="true">
              check_circle
            </span>
            {Math.round(aiTriage.confidence * 100)}% confianza
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Categoría sugerida */}
        <div>
          <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Categoría sugerida
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
              {categoryName ?? 'Categoría desconocida'}
            </span>
            {!categoryMatchesCurrent && (
              <button
                type="button"
                onClick={onAcceptCategory}
                disabled={isAcceptingCategory}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAcceptingCategory && (
                  <span className="material-icons text-[14px] animate-spin" aria-hidden="true">
                    refresh
                  </span>
                )}
                Aceptar categoría
              </button>
            )}
          </div>
        </div>

        {/* Prioridad sugerida */}
        <div>
          <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Prioridad sugerida
          </span>
          <div className="flex items-center justify-between gap-2">
            <PriorityBadge priority={aiTriage.suggestedPriority} />
            {!priorityMatchesCurrent && (
              <button
                type="button"
                onClick={onAcceptPriority}
                disabled={isAcceptingPriority}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAcceptingPriority && (
                  <span className="material-icons text-[14px] animate-spin" aria-hidden="true">
                    refresh
                  </span>
                )}
                Aceptar prioridad
              </button>
            )}
          </div>
        </div>

        {/* Respuesta inicial sugerida — locally dismissible, not persisted */}
        {!isResponseDismissed && (
          <>
            <hr className="border-gray-100" />
            <div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                <span className="material-icons text-[14px]" aria-hidden="true">
                  description
                </span>
                Respuesta inicial sugerida
              </span>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 whitespace-pre-wrap">
                {aiTriage.suggestedResponse}
              </div>
              <div className="flex flex-col gap-2 mt-3">
                <button
                  type="button"
                  onClick={onUseAsResponse}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <span className="material-icons text-[16px]" aria-hidden="true">
                    send
                  </span>
                  Usar como respuesta
                </button>
                <button
                  type="button"
                  onClick={() => setIsResponseDismissed(true)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Ignorar
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">Generado automáticamente. Revisá antes de enviar.</p>
    </div>
  )
}
