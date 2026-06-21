import type { UserRole } from '@/modules/users/schemas'

interface UserFiltersProps {
  search: string
  role: UserRole | null
  isActive: boolean | null
  isLoading: boolean
  onSearchChange: (value: string) => void
  onRoleChange: (value: UserRole | null) => void
  onActiveChange: (value: boolean | null) => void
  onReset: () => void
}

const SELECT_CLASS =
  'rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50'

export function UserFilters({
  search,
  role,
  isActive,
  isLoading,
  onSearchChange,
  onRoleChange,
  onActiveChange,
  onReset,
}: UserFiltersProps): React.JSX.Element {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onSearchChange(e.target.value)
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value
    onRoleChange(val === '' ? null : (val as UserRole))
  }

  const handleActiveChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value
    if (val === '') {
      onActiveChange(null)
    } else {
      onActiveChange(val === 'true')
    }
  }

  return (
    <div className="flex flex-wrap gap-3 items-center py-3">
      {/* Search */}
      <label className="sr-only" htmlFor="user-search">
        Search users
      </label>
      <input
        id="user-search"
        type="search"
        value={search}
        onChange={handleSearchChange}
        disabled={isLoading}
        placeholder="Search users..."
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-label="Search users"
      />

      {/* Role */}
      <select
        value={role ?? ''}
        onChange={handleRoleChange}
        disabled={isLoading}
        aria-label="Filter by role"
        className={SELECT_CLASS}
      >
        <option value="">All roles</option>
        <option value="client">Client</option>
        <option value="agent">Agent</option>
        <option value="admin">Admin</option>
      </select>

      {/* Active status */}
      <select
        value={isActive === null ? '' : String(isActive)}
        onChange={handleActiveChange}
        disabled={isLoading}
        aria-label="Filter by status"
        className={SELECT_CLASS}
      >
        <option value="">All statuses</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        disabled={isLoading}
        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        aria-label="Reset filters"
      >
        Reset
      </button>
    </div>
  )
}
