import { useEffect, useRef, useState } from 'react'
import type { TicketComment, StatusLogEntry, TicketStatus } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'
import { formatDateOnly } from '@/core/utils/format'
import { getInitials } from '@/core/utils/getInitials'

interface TicketCommentsProps {
  comments: TicketComment[]
  statusLog: StatusLogEntry[]
  ticketClientId: string
  ticketAgentId: string | null
  currentUserId: string | null
  onAddComment: (content: string) => void
  isLoading: boolean
  error: string | null
  ticketStatus: TicketStatus
  // Prellenado opcional que llega desde un componente padre (por ejemplo, "Usar como
  // respuesta" de AITriagePanel). Cuando se setea, el textarea se completa y se
  // notifica al padre mediante onPrefillConsumed para que pueda limpiar su propio estado — esto
  // permite que un segundo prellenado idéntico más adelante también dispare un nuevo llenado.
  prefillContent?: string
  onPrefillConsumed?: () => void
}

type FeedItem =
  | { type: 'comment'; data: TicketComment; date: string }
  | { type: 'status'; data: StatusLogEntry; date: string }

export function TicketComments({
  comments,
  statusLog,
  ticketClientId,
  ticketAgentId,
  currentUserId,
  onAddComment,
  isLoading,
  error,
  ticketStatus,
  prefillContent,
  onPrefillConsumed,
}: TicketCommentsProps): React.JSX.Element {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isResolved = ticketStatus === 'resuelto'
  const canComment =
    currentUserId !== null &&
    (currentUserId === ticketClientId || currentUserId === ticketAgentId)

  // Ver useTicketList.ts (src/modules/tickets/hooks) para entender por qué la actualización
  // de estado está envuelta en una función definida localmente e invocada desde dentro del
  // efecto en lugar de llamar a setContent directamente en el nivel superior del efecto
  // — react-hooks/set-state-in-effect marca esto último.
  useEffect(() => {
    if (!prefillContent) return

    function applyPrefill(): void {
      setContent(prefillContent as string)
      onPrefillConsumed?.()
    }

    applyPrefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillContent])

  // Hace crecer automáticamente el textarea para ajustarse a su contenido en lugar de hacer scroll
  // internamente. Se ejecuta en cada cambio de contenido, incluyendo un prellenado
  // de una sola vez (por ejemplo, una respuesta larga sugerida por IA), no solo por cada tecla presionada.
  //
  // Cuando el contenido está vacío (montaje inicial, o justo después de enviar —
  // handleSubmit resetea content a ''), se limpia cualquier override de altura inline
  // en lugar de medir scrollHeight: medir una caja vacía en el montaje es
  // poco confiable (el layout/las webfonts pueden no haberse asentado del todo en ese
  // momento), y las pruebas en vivo mostraron que puede quedar fijada una altura
  // incorrecta y sobredimensionada que después nunca se corrige, ya que el efecto no se vuelve a ejecutar
  // hasta el próximo cambio de content. Limpiarla permite que el valor por defecto de CSS rows={3}
  // tome el control, lo cual siempre es correcto para una caja vacía.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (!content) {
      el.style.height = ''
      return
    }
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [content])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || isLoading) return
    onAddComment(trimmed)
    setContent('')
  }

  const feed: FeedItem[] = [
    ...comments.map((c) => ({ type: 'comment' as const, data: c, date: c.createdAt })),
    ...statusLog.map((s) => ({ type: 'status' as const, data: s, date: s.changedAt })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="bg-white border border-gray-200 rounded-lg flex flex-col">
      {/* Encabezado */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-base font-semibold text-gray-900">Actividad</h3>
      </div>

      {/* Feed de actividad */}
      <div className="flex-1 p-4">
        {feed.length === 0 ? (
          <p className="text-sm text-gray-400">No hay actividad aún.</p>
        ) : (
          <ul className="flex flex-col gap-5">
            {feed.map((item) => {
              if (item.type === 'comment') {
                const comment = item.data
                const isClient = comment.userId === ticketClientId
                return (
                  <li key={`comment-${comment.id}`} className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className="shrink-0 rounded-full bg-gray-200 text-gray-600 w-9 h-9 flex items-center justify-center text-sm font-medium"
                      aria-hidden="true"
                    >
                      {getInitials(comment.userFullName)}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {comment.userFullName}
                        </span>
                        {isClient ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            Cliente
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Agente
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {formatDateOnly(comment.createdAt)}
                        </span>
                      </div>
                      {/* Burbuja */}
                      <div
                        className={[
                          'rounded-lg rounded-tl-none px-3 py-2.5 text-sm leading-relaxed',
                          isClient
                            ? 'bg-gray-50 border border-gray-200 text-gray-700'
                            : 'bg-white border border-gray-200 text-gray-700',
                        ].join(' ')}
                      >
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  </li>
                )
              }

              // Entrada de cambio de estado
              const entry = item.data
              return (
                <li key={`status-${entry.id}`} className="flex gap-3 items-start">
                  <div
                    className="shrink-0 w-9 h-9 flex items-center justify-center text-gray-400"
                    aria-hidden="true"
                  >
                    <span className="material-icons text-base">swap_horiz</span>
                  </div>
                  <div className="flex-1 bg-gray-50 border border-gray-100 rounded-md px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">{entry.changedByFullName}</span> cambió el estado
                      </span>
                      <span className="flex items-center gap-1">
                        {entry.fromStatus !== null ? (
                          <StatusBadge status={entry.fromStatus} />
                        ) : (
                          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                            inicial
                          </span>
                        )}
                        <span className="material-icons text-sm text-gray-400">arrow_forward</span>
                        <StatusBadge status={entry.toStatus} />
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDateOnly(entry.changedAt)}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mx-4 mb-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Área de entrada */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        {isResolved ? (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            Este ticket está resuelto. Reabrilo para poder comentar.
          </div>
        ) : !canComment ? (
          <div className="rounded-md bg-gray-100 border border-gray-200 px-4 py-3 text-sm text-gray-500">
            Solo el agente asignado y el cliente del ticket pueden comentar.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder="Escribí un comentario..."
              aria-label="Nuevo comentario"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none overflow-hidden"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || content.trim().length === 0}
                className="rounded-lg bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 text-sm font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
