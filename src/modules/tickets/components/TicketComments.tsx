import { useState } from 'react'
import type { TicketComment, StatusLogEntry, TicketStatus } from '@/modules/tickets/schemas'
import { StatusBadge } from '@/ui/StatusBadge'

interface TicketCommentsProps {
  comments: TicketComment[]
  statusLog: StatusLogEntry[]
  ticketClientId: string
  onAddComment: (content: string) => void
  isLoading: boolean
  error: string | null
  ticketStatus: TicketStatus
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
  onAddComment,
  isLoading,
  error,
  ticketStatus,
}: TicketCommentsProps): React.JSX.Element {
  const [content, setContent] = useState('')
  const isResolved = ticketStatus === 'resuelto'

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || isLoading) return
    onAddComment(trimmed)
    setContent('')
  }

  // Build unified feed sorted by date ASC
  const feed: FeedItem[] = [
    ...comments.map((c) => ({ type: 'comment' as const, data: c, date: c.createdAt })),
    ...statusLog.map((s) => ({ type: 'status' as const, data: s, date: s.changedAt })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Actividad</h2>

      {/* Unified feed */}
      {feed.length === 0 ? (
        <p className="text-sm text-gray-500">No hay actividad aún.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {feed.map((item) => {
            if (item.type === 'comment') {
              const comment = item.data
              const isClient = comment.userId === ticketClientId
              return (
                <li key={`comment-${comment.id}`} className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className="shrink-0 rounded-full bg-blue-100 text-blue-700 w-8 h-8 flex items-center justify-center text-sm font-medium"
                    aria-hidden="true"
                  >
                    {getInitial(comment.userFullName)}
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{comment.userFullName}</span>
                      {isClient ? (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                          Cliente
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
                          Agente
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </li>
              )
            }

            // status entry
            const entry = item.data
            return (
              <li key={`status-${entry.id}`} className="flex gap-3 items-start">
                <div className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400" aria-hidden="true">
                  <span className="material-icons text-base">swap_horiz</span>
                </div>
                <div className="flex-1 bg-gray-50 rounded-md px-3 py-2">
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
                    <span className="text-xs text-gray-400">{formatDate(entry.changedAt)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Error banner */}
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resolved-ticket notice or comment form */}
      {isResolved ? (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          Este ticket está resuelto. Reabrilo para poder comentar.
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
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || content.trim().length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
