import type { AdminUser } from '@/modules/users/schemas'
import { Spinner } from '@/ui/Spinner'
import { EmptyState } from '@/ui/EmptyState'
import { Pagination } from '@/ui/Pagination'
import { UserAvatar } from './UserAvatar'
import { UserRoleBadge } from './UserRoleBadge'
import { UserStatusBadge } from './UserStatusBadge'

interface UserTableProps {
  users: AdminUser[]
  isLoading: boolean
  totalCount: number
  currentPage: number
  pageSize: number
  currentUserId: string
  onRoleChange: (user: AdminUser) => void
  onSpecialtyChange: (user: AdminUser) => void
  onStatusToggle: (user: AdminUser) => void
  onPageChange: (page: number) => void
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function UserTable({
  users,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  currentUserId,
  onRoleChange,
  onSpecialtyChange,
  onStatusToggle,
  onPageChange,
}: UserTableProps): React.JSX.Element {
  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="No hay usuarios"
        description="Ningún usuario coincide con los filtros actuales."
      />
    )
  }

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 bg-white">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Usuario
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Rol
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Especialidad
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Estado
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Creado
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  {/* Avatar + Nombre */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatarUrl={user.avatarUrl}
                        fullName={user.fullName}
                        size="sm"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {user.fullName}
                      </span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>

                  {/* Rol */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <UserRoleBadge role={user.role} />
                  </td>

                  {/* Especialidad */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {user.categoryName || '—'}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <UserStatusBadge isActive={user.isActive} />
                  </td>

                  {/* Creado */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    <time dateTime={user.createdAt}>
                      {formatDate(user.createdAt)}
                    </time>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Botón editar rol */}
                      <button
                        type="button"
                        onClick={() => onRoleChange(user)}
                        disabled={isSelf}
                        aria-label="Edit role"
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="material-icons text-base">edit</span>
                      </button>

                      {/* Botón editar especialidad — la especialidad solo aplica a agentes */}
                      <button
                        type="button"
                        onClick={() => onSpecialtyChange(user)}
                        disabled={user.role !== 'agent'}
                        aria-label="Edit specialty"
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="material-icons text-base">build</span>
                      </button>

                      {/* Botón alternar estado */}
                      {user.isActive ? (
                        <button
                          type="button"
                          onClick={() => onStatusToggle(user)}
                          disabled={isSelf}
                          aria-label="Deactivate user"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="material-icons text-base">person_off</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onStatusToggle(user)}
                          disabled={isSelf}
                          aria-label="Activate user"
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="material-icons text-base">settings_backup_restore</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Texto de paginación + controles */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Mostrando {from}-{to} de {totalCount} usuarios
          </span>
          <Pagination
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}
