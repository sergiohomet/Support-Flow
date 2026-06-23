import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '@/store'
import { useTicketDetail } from '@/modules/tickets/hooks/useTicketDetail'
import { useAssignTicket } from '@/modules/tickets/hooks/useAssignTicket'
import { useUpdateTicketStatus } from '@/modules/tickets/hooks/useUpdateTicketStatus'
import { useAddComment } from '@/modules/tickets/hooks/useAddComment'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { TicketDetailHeader } from '@/modules/tickets/components/TicketDetailHeader'
import { TicketComments } from '@/modules/tickets/components/TicketComments'
import { TicketStatusLog } from '@/modules/tickets/components/TicketStatusLog'
import { AssignAgentPanel } from '@/modules/tickets/components/AssignAgentPanel'
import { StatusUpdatePanel } from '@/modules/tickets/components/StatusUpdatePanel'
import { Spinner } from '@/ui/Spinner'
import type { TicketStatus } from '@/modules/tickets/schemas'

export function TicketDetailPage(): React.ReactElement {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { ticket, comments, statusLog, isLoading: detailLoading, error: detailError, fetch: fetchDetail } = useTicketDetail()
  const { execute: assignTicket, isLoading: assignLoading, error: assignError } = useAssignTicket()
  const { execute: updateStatus, isLoading: statusLoading, error: statusError } = useUpdateTicketStatus()
  const { execute: addComment, isLoading: commentLoading, error: commentError } = useAddComment()
  const { loadAgents } = useTicketList()

  const user = useStore((s) => s.user)
  const agents = useStore((s) => s.agents)

  useEffect(() => {
    if (!id) return
    void fetchDetail(id)
    void loadAgents()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAssign = async (agentId: string): Promise<void> => {
    if (!id) return
    const ok = await assignTicket(id, agentId)
    if (ok) void fetchDetail(id)
  }

  const handleStatusUpdate = async (newStatus: TicketStatus): Promise<void> => {
    if (!id || !ticket) return
    const ok = await updateStatus(id, ticket.status, newStatus)
    if (ok) void fetchDetail(id)
  }

  const handleAddComment = async (content: string): Promise<void> => {
    if (!id) return
    await addComment(id, content)
    void fetchDetail(id)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {detailLoading && !ticket && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {detailError && !ticket && (
        <p className="text-red-600 text-sm">{detailError}</p>
      )}
      {ticket && (
        <>
          <TicketDetailHeader ticket={ticket} onBack={() => navigate(-1)} />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col gap-6">
              <TicketComments
                comments={comments}
                onAddComment={handleAddComment}
                isLoading={commentLoading}
                error={commentError}
                ticketStatus={ticket.status}
              />
              <TicketStatusLog statusLog={statusLog} />
            </div>
            <div className="flex flex-col gap-4">
              <StatusUpdatePanel
                currentStatus={ticket.status}
                userRole={user?.role ?? 'client'}
                onUpdate={handleStatusUpdate}
                isLoading={statusLoading}
                error={statusError}
              />
              {(user?.role === 'agent' || user?.role === 'admin') && (
                <AssignAgentPanel
                  agents={agents}
                  currentAgentId={ticket.agentId}
                  onAssign={handleAssign}
                  isLoading={assignLoading}
                  error={assignError}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
