import { useEffect, useRef, useState } from 'react'
import { createUserInputSchema } from '@/modules/users/schemas'
import type { CreateUserInput } from '@/modules/users/schemas'

interface CreateUserModalProps {
  isOpen: boolean
  isLoading: boolean
  error: string | null
  onSubmit: (input: CreateUserInput) => void
  onClose: () => void
}

interface FormErrors {
  fullName?: string
  email?: string
  temporaryPassword?: string
  role?: string
}

export function CreateUserModal({
  isOpen,
  isLoading,
  error,
  onSubmit,
  onClose,
}: CreateUserModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [role, setRole] = useState<'agent' | 'admin'>('agent')
  const [specialty, setSpecialty] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const formData = {
      fullName,
      email,
      temporaryPassword,
      role,
      specialty: specialty.trim() === '' ? null : specialty.trim(),
    }

    const result = createUserInputSchema.safeParse(formData)

    if (!result.success) {
      const errors: FormErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FormErrors
        if (!errors[field]) {
          errors[field] = issue.message
        }
      }
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    onSubmit(result.data)
  }

  return (
    <dialog
      ref={dialogRef}
      open={isOpen || undefined}
      className="rounded-lg p-6 shadow-xl backdrop:bg-black/40 max-w-lg w-full"
      onClose={onClose}
    >
      <h2 className="text-lg font-semibold text-gray-900">Create user</h2>

      {error && (
        <div role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.fullName && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="temporaryPassword" className="block text-sm font-medium text-gray-700">
            Temporary password
          </label>
          <input
            id="temporaryPassword"
            type="password"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {fieldErrors.temporaryPassword && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.temporaryPassword}</p>
          )}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'agent' | 'admin')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
            Specialty
          </label>
          <input
            id="specialty"
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create user
          </button>
        </div>
      </form>
    </dialog>
  )
}
