import { useEffect, useState } from 'react'
import type { TicketComment, StatusLogEntry, TicketStatus } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'

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
  // Optional prefill lifted from a parent (e.g. AITriagePanel's "Usar como
  // respuesta"). When set, the textarea is populated and the parent is
  // notified via onPrefillConsumed so it can clear its own state — this
  // allows a second identical prefill later to still trigger a re-populate.
  prefillContent?: string
  onPrefillConsumed?: () => void
}

type FeedItem =
  | { type: 'comment'; data: TicketComment; date: string }
  | { type: 'status'; data: StatusLogEntry; date: string }

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

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
  const isResolved = ticketStatus === 'resuelto'
  const canComment =
    currentUserId !== null &&
    (currentUserId === ticketClientId || currentUserId === ticketAgentId)

  // See useTicketList.ts (src/modules/tickets/hooks) for why the state
  // update is wrapped in a locally-defined function invoked from within the
  // effect instead of calling setContent directly at the effect's top level
  // — react-hooks/set-state-in-effect flags the latter.
  useEffect(() => {
    if (!prefillContent) return

    function applyPrefill(): void {
      setContent(prefillContent as string)
      onPrefillConsumed?.()
    }

    applyPrefill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillContent])

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
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-base font-semibold text-gray-900">Actividad</h3>
      </div>

      {/* Feed */}
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
                      {getInitial(comment.userFullName)}
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
                          {formatDate(comment.createdAt)}
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

              // Status entry
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
                        {formatDate(entry.changedAt)}
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

      {/* Input area */}
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
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder="Escribí un comentario..."
              aria-label="Nuevo comentario"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
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
