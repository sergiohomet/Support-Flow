import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AdminUser } from '@/modules/users/schemas'
import { UserTable } from '../UserTable'

const mockOnRoleChange = vi.fn()
const mockOnStatusToggle = vi.fn()
const mockOnPageChange = vi.fn()

const USERS: AdminUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    fullName: 'Alice Smith',
    avatarUrl: null,
    role: 'admin',
    specialty: 'Backend',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    fullName: 'Bob Jones',
    avatarUrl: null,
    role: 'agent',
    specialty: null,
    isActive: false,
    createdAt: '2024-02-20T12:00:00Z',
  },
]

function renderTable(overrides: {
  users?: AdminUser[]
  isLoading?: boolean
  totalCount?: number
  currentPage?: number
  pageSize?: number
  currentUserId?: string
} = {}) {
  return render(
    <UserTable
      users={overrides.users ?? USERS}
      isLoading={overrides.isLoading ?? false}
      totalCount={overrides.totalCount ?? USERS.length}
      currentPage={overrides.currentPage ?? 1}
      pageSize={overrides.pageSize ?? 20}
      currentUserId={overrides.currentUserId ?? 'other-user'}
      onRoleChange={mockOnRoleChange}
      onStatusToggle={mockOnStatusToggle}
      onPageChange={mockOnPageChange}
    />,
  )
}

describe('UserTable', () => {
  beforeEach(() => {
    mockOnRoleChange.mockReset()
    mockOnStatusToggle.mockReset()
    mockOnPageChange.mockReset()
  })

  describe('rows', () => {
    it('renders one row per user in the users array', () => {
      renderTable()

      const rows = screen.getAllByRole('row')
      // header row + 2 data rows
      expect(rows).toHaveLength(3)
    })

    it('renders user email in each row', () => {
      renderTable()

      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('renders specialty when present', () => {
      renderTable()

      expect(screen.getByText('Backend')).toBeInTheDocument()
    })

    it('renders em dash when specialty is null', () => {
      renderTable()

      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders formatted createdAt date for each user', () => {
      renderTable()

      const date1 = new Date('2024-01-15T10:00:00Z').toLocaleDateString()
      expect(screen.getByText(date1)).toBeInTheDocument()
    })
  })

  describe('role and status badges', () => {
    it('renders UserRoleBadge for each row role', () => {
      renderTable()

      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Agent')).toBeInTheDocument()
    })

    it('renders UserStatusBadge for each row isActive value', () => {
      renderTable()

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('calls onRoleChange with the correct user when edit button is clicked', async () => {
      const user = userEvent.setup()
      renderTable()

      const editButtons = screen.getAllByRole('button', { name: /edit role/i })
      await user.click(editButtons[0])

      expect(mockOnRoleChange).toHaveBeenCalledOnce()
      expect(mockOnRoleChange).toHaveBeenCalledWith(USERS[0])
    })

    it('calls onStatusToggle with the correct user when status button is clicked', async () => {
      const user = userEvent.setup()
      renderTable()

      const toggleButtons = screen.getAllByRole('button', { name: /deactivate|activate/i })
      await user.click(toggleButtons[0])

      expect(mockOnStatusToggle).toHaveBeenCalledOnce()
      expect(mockOnStatusToggle).toHaveBeenCalledWith(USERS[0])
    })

    it('disables action buttons for the row where user.id === currentUserId', () => {
      renderTable({ currentUserId: 'user-1' })

      const rows = screen.getAllByRole('row')
      // row index 1 is the first data row (user-1)
      const firstDataRow = rows[1]
      const buttons = within(firstDataRow).getAllByRole('button')
      buttons.forEach((btn) => expect(btn).toBeDisabled())
    })

    it('does not disable action buttons for rows where user.id !== currentUserId', () => {
      renderTable({ currentUserId: 'user-1' })

      const rows = screen.getAllByRole('row')
      const secondDataRow = rows[2]
      const buttons = within(secondDataRow).getAllByRole('button')
      buttons.forEach((btn) => expect(btn).not.toBeDisabled())
    })
  })

  describe('loading state', () => {
    it('shows Spinner when isLoading is true and users is empty', () => {
      renderTable({ users: [], isLoading: true, totalCount: 0 })

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state when users is empty and isLoading is false', () => {
      renderTable({ users: [], isLoading: false, totalCount: 0 })

      expect(screen.getByText(/no users found/i)).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('renders Pagination when totalCount > pageSize', () => {
      renderTable({ totalCount: 50, pageSize: 20 })

      expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument()
    })

    it('does not render Pagination when totalCount <= pageSize', () => {
      renderTable({ totalCount: 5, pageSize: 20 })

      expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument()
    })
  })
})
