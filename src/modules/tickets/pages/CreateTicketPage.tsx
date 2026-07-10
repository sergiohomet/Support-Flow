import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useCategoryList } from '@/modules/tickets/hooks/useCategoryList'
import { useCreateTicket } from '@/modules/tickets/hooks/useCreateTicket'
import { CreateTicketForm } from '@/modules/tickets/components/CreateTicketForm'
import type { CreateTicketInput } from '@/modules/tickets/schemas'

export function CreateTicketPage(): React.ReactElement {
  const navigate = useNavigate()
  useCategoryList()
  const { execute, isLoading, error } = useCreateTicket()

  const categories = useStore((s) => s.categories)

  const handleSubmit = async (input: CreateTicketInput): Promise<void> => {
    const newId = await execute(input)
    if (newId) navigate('/tickets/' + newId, { replace: true })
  }

  return (
    <div className="max-w-[700px] w-full mx-auto py-8 px-6">
      {/* Breadcrumb + título */}
      <div className="mb-6">
        <nav aria-label="Breadcrumb" className="flex text-xs text-gray-500 mb-2">
          <ol className="inline-flex items-center gap-1">
            <li>
              <button onClick={() => navigate(-1)} className="hover:text-blue-600 transition-colors">
                Mis Tickets
              </button>
            </li>
            <li>
              <span className="material-icons text-sm leading-none">chevron_right</span>
            </li>
            <li className="text-gray-800 font-medium">Crear</li>
          </ol>
        </nav>
        <h1 className="text-2xl font-semibold text-gray-900">Crear Nuevo Ticket</h1>
      </div>

      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <CreateTicketForm
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  )
}
