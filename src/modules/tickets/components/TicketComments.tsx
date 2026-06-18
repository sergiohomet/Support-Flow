import { useState } from 'react'
import type { TicketComment, TicketStatus } from '@/modules/tickets/schemas'

interface TicketCommentsProps {
  comments: TicketComment[]
  onAddComment: (content: string) => void
  isLoading: boolean
  error: string | null
  ticketStatus: TicketStatus
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function TicketComments({
  comments,
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-gray-900">Comentarios</h2>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-sm text-gray-500">No hay comentarios aún.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-100">
          {comments.map((comment) => (
            <li key={comment.id} className="py-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{comment.userFullName}</span>
                <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </li>
          ))}
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
