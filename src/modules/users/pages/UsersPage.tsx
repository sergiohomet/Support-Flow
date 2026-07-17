import { useState } from 'react'
import { useDebounce } from '@/core/hooks/useDebounce'
import { useStore } from '@/store'
import { useListUsers } from '@/modules/users/hooks/useListUsers'
import { useCreateUser } from '@/modules/users/hooks/useCreateUser'
import { useCategoryList } from '@/modules/tickets/hooks/useCategoryList'
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
// Componente
// ---------------------------------------------------------------------------

export function UsersPage(): React.JSX.Element {
  // Autenticación
  const currentUserId = useStore((s) => s.user?.id ?? '')
  const categories = useStore((s) => s.categories)

  // Estado de filtros
  const [search, setSearch] = useState('')
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter>('')
  const [page, setPage] = useState(1)

  // Estado de modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: AdminUser; selectedRole: 'agent' | 'admin' } | null>(null)
  const [pendingSpecialtyChange, setPendingSpecialtyChange] = useState<AdminUser | null>(null)
  const [pendingStatusToggle, setPendingStatusToggle] = useState<AdminUser | null>(null)

  // Parámetros de filtro derivados
  const { role, isActive } = filterToParams(combinedFilter)

  // Valor de búsqueda con debounce
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
  useCategoryList()

  // Reinicia la página cuando cambian los filtros (no cuando cambia la página en sí)
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
  // Crear usuario
  // ---------------------------------------------------------------------------

  const handleCreateUser = async (input: CreateUserInput): Promise<void> => {
    const ok = await createUser(input)
    if (ok) {
      setIsCreateModalOpen(false)
      void refetch()
    }
  }

  // ---------------------------------------------------------------------------
  // Cambio de rol
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
  // Cambio de especialidad
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
  // Alternar estado
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
  // Renderizado
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Encabezado */}
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

      {/* Banner de error */}
      {error && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <UserFilters
        search={search}
        combinedFilter={combinedFilter}
        isLoading={isFetching}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Tabla o estado vacío */}
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

      {/* Modal de creación de usuario */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        isLoading={isCreating}
        error={createError}
        categories={categories}
        onSubmit={handleCreateUser}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal de cambio de rol */}
      <RoleChangeModal
        isOpen={!!pendingRoleChange}
        user={pendingRoleChange ? { id: pendingRoleChange.user.id, fullName: pendingRoleChange.user.fullName, role: pendingRoleChange.user.role } : null}
        categories={categories}
        isLoading={isUpdatingRole}
        error={null}
        onConfirm={handleConfirmRoleChange}
        onClose={() => setPendingRoleChange(null)}
      />

      {/* Modal de cambio de especialidad */}
      <SpecialtyChangeModal
        isOpen={!!pendingSpecialtyChange}
        user={pendingSpecialtyChange ? { id: pendingSpecialtyChange.id, fullName: pendingSpecialtyChange.fullName, categoryId: pendingSpecialtyChange.categoryId } : null}
        categories={categories}
        isLoading={isUpdatingSpecialty}
        error={specialtyError}
        onConfirm={handleConfirmSpecialtyChange}
        onClose={() => setPendingSpecialtyChange(null)}
      />

      {/* Modal de confirmación para alternar estado */}
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
