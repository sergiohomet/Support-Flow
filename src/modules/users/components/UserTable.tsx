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
  onStatusToggle: (user: AdminUser) => void
  onPageChange: (page: number) => void
}

export function UserTable({
  users,
  isLoading,
  totalCount,
  currentPage,
  pageSize,
  currentUserId,
  onRoleChange,
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
        title="No users found"
        description="No users match the current filters."
      />
    )
  }

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
                Name
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
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Specialty
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Created
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  {/* Avatar + Name */}
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

                  {/* Role */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <UserRoleBadge role={user.role} />
                  </td>

                  {/* Specialty */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {user.specialty ?? '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <UserStatusBadge isActive={user.isActive} />
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    <time dateTime={user.createdAt}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </time>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit role button */}
                      <button
                        type="button"
                        onClick={() => onRoleChange(user)}
                        disabled={isSelf}
                        aria-label="Edit role"
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536M9 11l6.464-6.464a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110 14.5H8v-2a2 2 0 01.586-1.414z"
                          />
                        </svg>
                      </button>

                      {/* Toggle status button */}
                      <button
                        type="button"
                        onClick={() => onStatusToggle(user)}
                        disabled={isSelf}
                        aria-label={user.isActive ? 'Deactivate user' : 'Activate user'}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {user.isActive ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalCount > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
