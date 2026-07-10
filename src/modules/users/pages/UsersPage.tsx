import { useEffect, useState } from 'react'
import { useDebounce } from '@/core/hooks/useDebounce'
import { useStore } from '@/store'
import { useListUsers } from '@/modules/users/hooks/useListUsers'
import { useCreateUser } from '@/modules/users/hooks/useCreateUser'
import { useTicketList } from '@/modules/tickets/hooks/useTicketList'
import { useUpdateUserRole } from '@/modules/users/hooks/useUpdateUserRole'
import { useUpdateUserSpecialty } from '@/modules/users/hooks/useUpdateUserSpecialty'
import { useToggleUserStatus } from '@/modules/users/hooks/useToggleUserStatus'
import { UserFilters } from '@/modules/users/components/UserFilters'
import { UserTable } from '@/modules/users/components/UserTable'
import { CreateUserModal } from '@/modules/users/components/CreateUserModal'
import { ConfirmModal } from '@/modules/users/components/ConfirmModal'
import { RoleChangeModal } from '@/modules/users/components/RoleChangeModal'
import { SpecialtyChangeModal } from '@/modules/users/components/SpecialtyChangeModal'
import { filterToParams } from './filterToParams'
import type { CombinedFilter } from '@/modules/users/components/UserFilters'
import type { AdminUser, UserRole, CreateUserInput } from '@/modules/users/schemas'

const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UsersPage(): React.JSX.Element {
  // Auth
  const currentUserId = useStore((s) => s.user?.id ?? '')
  const categories = useStore((s) => s.categories)

  // Filter state
  const [search, setSearch] = useState('')
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter>('')
  const [page, setPage] = useState(1)

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: AdminUser; selectedRole: 'agent' | 'admin' } | null>(null)
  const [pendingSpecialtyChange, setPendingSpecialtyChange] = useState<AdminUser | null>(null)
  const [pendingStatusToggle, setPendingStatusToggle] = useState<AdminUser | null>(null)

  // Derived filter params
  const { role, isActive } = filterToParams(combinedFilter)

  // Debounced search value
  const debouncedSearch = useDebounce(search, 300)

  // Hay filtro activo cuando el usuario escribió algo o eligió una opción del dropdown
  const hasActiveFilters = debouncedSearch.trim() !== '' || combinedFilter !== ''

  // Hooks
  const { users, totalCount, isFetching, error, refetch } = useListUsers({
    search: debouncedSearch.trim() === '' ? null : debouncedSearch.trim(),
    role,
    isActive,
    page,
    pageSize: PAGE_SIZE,
    enabled: hasActiveFilters,
  })
  const { execute: createUser, isLoading: isCreating, error: createError } = useCreateUser()
  const { execute: updateRole, isLoading: isUpdatingRole } = useUpdateUserRole()
  const { execute: updateSpecialty, isLoading: isUpdatingSpecialty, error: specialtyError } = useUpdateUserSpecialty()
  const { execute: toggleStatus, isLoading: isTogglingStatus } = useToggleUserStatus()
  const { loadCategories } = useTicketList()

  // TODO(PR4): loadCategories still comes from useTicketList — that hook will
  // be split into useTicketList/useCategoryList/useAgentList; this page
  // should call useCategoryList() directly once that lands.
  useEffect(() => {
    void loadCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    setCombinedFilter('')
    setPage(1)
  }

  // ---------------------------------------------------------------------------
  // Create user
  // ---------------------------------------------------------------------------

  const handleCreateUser = async (input: CreateUserInput): Promise<void> => {
    const ok = await createUser(input)
    if (ok) {
      setIsCreateModalOpen(false)
      void refetch()
    }
  }

  // ---------------------------------------------------------------------------
  // Role change
  // ---------------------------------------------------------------------------

  const handleRoleChange = (user: AdminUser): void => {
    const selectedRole: 'agent' | 'admin' = user.role === 'admin' ? 'admin' : 'agent'
    setPendingRoleChange({ user, selectedRole })
  }

  const handleConfirmRoleChange = async (newRole: 'agent' | 'admin', categoryId?: string): Promise<void> => {
    if (!pendingRoleChange) return
    const ok = await updateRole(pendingRoleChange.user.id, newRole as UserRole, categoryId)
    if (ok) {
      setPendingRoleChange(null)
      void refetch()
    }
  }

  // ---------------------------------------------------------------------------
  // Specialty change
  // ---------------------------------------------------------------------------

  const handleSpecialtyChange = (user: AdminUser): void => {
    setPendingSpecialtyChange(user)
  }

  const handleConfirmSpecialtyChange = async (categoryId: string): Promise<void> => {
    if (!pendingSpecialtyChange) return
    const ok = await updateSpecialty(pendingSpecialtyChange.id, categoryId)
    if (ok) {
      setPendingSpecialtyChange(null)
      void refetch()
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
      void refetch()
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
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Table o empty state */}
      {hasActiveFilters ? (
        <UserTable
          users={users}
          isLoading={isFetching}
          totalCount={totalCount}
          currentPage={page}
          pageSize={PAGE_SIZE}
          currentUserId={currentUserId}
          onRoleChange={handleRoleChange}
          onSpecialtyChange={handleSpecialtyChange}
          onStatusToggle={handleStatusToggle}
          onPageChange={setPage}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-icons text-4xl text-gray-300 mb-3">manage_accounts</span>
          <p className="text-sm text-gray-500">
            Usá el buscador o seleccioná un filtro para ver usuarios.
          </p>
        </div>
      )}

      {/* Create user modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        isLoading={isCreating}
        error={createError}
        categories={categories}
        onSubmit={handleCreateUser}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Role change modal */}
      <RoleChangeModal
        isOpen={!!pendingRoleChange}
        user={pendingRoleChange ? { fullName: pendingRoleChange.user.fullName, role: pendingRoleChange.user.role } : null}
        categories={categories}
        isLoading={isUpdatingRole}
        error={null}
        onConfirm={handleConfirmRoleChange}
        onClose={() => setPendingRoleChange(null)}
      />

      {/* Specialty change modal */}
      <SpecialtyChangeModal
        isOpen={!!pendingSpecialtyChange}
        user={pendingSpecialtyChange ? { fullName: pendingSpecialtyChange.fullName, categoryId: pendingSpecialtyChange.categoryId } : null}
        categories={categories}
        isLoading={isUpdatingSpecialty}
        error={specialtyError}
        onConfirm={handleConfirmSpecialtyChange}
        onClose={() => setPendingSpecialtyChange(null)}
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
