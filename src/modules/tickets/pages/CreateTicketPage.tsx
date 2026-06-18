import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { useCreateTicket } from '@/modules/tickets/hooks/useCreateTicket'
import { CreateTicketForm } from '@/modules/tickets/components/CreateTicketForm'
import type { CreateTicketInput } from '@/modules/tickets/schemas'

export function CreateTicketPage(): React.ReactElement {
  const navigate = useNavigate()
  const { loadCategories } = useTicketList()
  const { execute, isLoading, error } = useCreateTicket()

  const categories = useStore((s) => s.categories)

  useEffect(() => {
    void loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (input: CreateTicketInput): Promise<void> => {
    const newId = await execute(input)
    if (newId) navigate('/tickets/' + newId, { replace: true })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nuevo ticket</h1>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <CreateTicketForm
          categories={categories}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}
