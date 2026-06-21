import { useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/useDebounce'
import { useStore } from '@/store'
import { useListUsers } from '@/modules/users/hooks/useListUsers'
import { useCreateUser } from '@/modules/users/hooks/useCreateUser'
import { useUpdateUserRole } from '@/modules/users/hooks/useUpdateUserRole'
import { useToggleUserStatus } from '@/modules/users/hooks/useToggleUserStatus'
import { UserFilters } from '@/modules/users/components/UserFilters'
import { UserTable } from '@/modules/users/components/UserTable'
import { CreateUserModal } from '@/modules/users/components/CreateUserModal'
import { ConfirmModal } from '@/modules/users/components/ConfirmModal'
import { RoleChangeModal } from '@/modules/users/components/RoleChangeModal'
import type { CombinedFilter } from '@/modules/users/components/UserFilters'
import type { AdminUser, UserRole, CreateUserInput } from '@/modules/users/schemas'

// ---------------------------------------------------------------------------
// Filter → RPC params mapping
// ---------------------------------------------------------------------------

function filterToParams(f: CombinedFilter): { role: UserRole | null; isActive: boolean | null } {
  if (f === 'admin') return { role: 'admin', isActive: null }
  if (f === 'agent') return { role: 'agent', isActive: null }
  if (f === 'client') return { role: 'client', isActive: null }
  if (f === 'inactive') return { role: null, isActive: false }
  return { role: null, isActive: null }
}

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsersPage(): React.JSX.Element {
  // Auth
  const currentUserId = useStore((s) => s.user?.id ?? '')

  // Hooks
  const { users, totalCount, isFetching, error, fetch } = useListUsers()
  const { execute: createUser, isLoading: isCreating, error: createError } = useCreateUser()
  const { execute: updateRole, isLoading: isUpdatingRole } = useUpdateUserRole()
  const { execute: toggleStatus, isLoading: isTogglingStatus } = useToggleUserStatus()

  // Filter state
  const [search, setSearch] = useState('')
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter>('all')
  const [page, setPage] = useState(1)

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: AdminUser; selectedRole: 'agent' | 'admin' } | null>(null)
  const [pendingStatusToggle, setPendingStatusToggle] = useState<AdminUser | null>(null)

  // Derived filter params
  const { role, isActive } = filterToParams(combinedFilter)

  // Debounced search value
  const debouncedSearch = useDebounce(search, 300)

  // ---------------------------------------------------------------------------
  // Fetch effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    void fetch({
      search: debouncedSearch.trim() === '' ? null : debouncedSearch.trim(),
      role,
      isActive,
      page,
      pageSize: PAGE_SIZE,
    })
  }, [debouncedSearch, combinedFilter, page]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when filters change (not when page itself changes)
  const handleFilterChange = (value: CombinedFilter): void => {
    setCombinedFilter(value)
    setPage(1)
  }

  const handleSearchChange = (value: string): void => {
    setSearch(value)
    setPage(1)
  }

  const handleReset = (): void => {
    setSearch('')
    setCombinedFilter('all')
    setPage(1)
  }

  // ---------------------------------------------------------------------------
  // Create user
  // ---------------------------------------------------------------------------

  const handleCreateUser = async (input: CreateUserInput): Promise<void> => {
    const ok = await createUser(input)
    if (ok) {
      setIsCreateModalOpen(false)
      void fetch({ search: null, role, isActive, page, pageSize: PAGE_SIZE })
    }
  }

  // ---------------------------------------------------------------------------
  // Role change
  // ---------------------------------------------------------------------------

  const handleRoleChange = (user: AdminUser): void => {
    const selectedRole: 'agent' | 'admin' = user.role === 'admin' ? 'admin' : 'agent'
    setPendingRoleChange({ user, selectedRole })
  }

  const handleConfirmRoleChange = async (newRole: 'agent' | 'admin'): Promise<void> => {
    if (!pendingRoleChange) return
    const ok = await updateRole(pendingRoleChange.user.id, newRole as UserRole)
    if (ok) {
      setPendingRoleChange(null)
      void fetch({ search: null, role, isActive, page, pageSize: PAGE_SIZE })
    }
  }

  // ---------------------------------------------------------------------------
  // Status toggle
  // ---------------------------------------------------------------------------

  const handleStatusToggle = (user: AdminUser): void => {
    setPendingStatusToggle(user)
  }

  const handleConfirmStatusToggle = async (): Promise<void> => {
    if (!pendingStatusToggle) return
    const ok = await toggleStatus(pendingStatusToggle.id, !pendingStatusToggle.isActive)
    if (ok) {
      setPendingStatusToggle(null)
      void fetch({ search: null, role, isActive, page, pageSize: PAGE_SIZE })
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los accesos y roles de tu equipo y clientes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <span className="material-icons text-base">person_add</span>
          Nuevo Usuario
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <UserFilters
        search={search}
        combinedFilter={combinedFilter}
        isLoading={isFetching}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Table */}
      <UserTable
        users={users}
        isLoading={isFetching}
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        currentUserId={currentUserId}
        onRoleChange={handleRoleChange}
        onStatusToggle={handleStatusToggle}
        onPageChange={setPage}
      />

      {/* Create user modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        isLoading={isCreating}
        error={createError}
        onSubmit={handleCreateUser}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Role change modal */}
      <RoleChangeModal
        isOpen={!!pendingRoleChange}
        user={pendingRoleChange ? { fullName: pendingRoleChange.user.fullName, role: pendingRoleChange.user.role } : null}
        isLoading={isUpdatingRole}
        error={null}
        onConfirm={handleConfirmRoleChange}
        onClose={() => setPendingRoleChange(null)}
      />

      {/* Confirm status toggle modal */}
      <ConfirmModal
        isOpen={!!pendingStatusToggle}
        title={pendingStatusToggle?.isActive ? 'Desactivar usuario' : 'Reactivar usuario'}
        description={
          pendingStatusToggle
            ? pendingStatusToggle.isActive
              ? `¿Desactivar a ${pendingStatusToggle.fullName}? No podrá iniciar sesión.`
              : `¿Reactivar a ${pendingStatusToggle.fullName}?`
            : ''
        }
        confirmLabel={pendingStatusToggle?.isActive ? 'Desactivar' : 'Reactivar'}
        isLoading={isTogglingStatus}
        onConfirm={handleConfirmStatusToggle}
        onClose={() => setPendingStatusToggle(null)}
      />
    </div>
  )
}
