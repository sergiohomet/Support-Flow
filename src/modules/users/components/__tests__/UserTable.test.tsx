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

  describe('column headers', () => {
    it('renders all column headers in Spanish', () => {
      renderTable()
      expect(screen.getByText('Usuario')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Rol')).toBeInTheDocument()
      expect(screen.getByText('Especialidad')).toBeInTheDocument()
      expect(screen.getByText('Estado')).toBeInTheDocument()
      expect(screen.getByText('Creado')).toBeInTheDocument()
      expect(screen.getByText('Acciones')).toBeInTheDocument()
    })
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

      // bob has null specialty — should render —
      expect(screen.getByText('—')).toBeInTheDocument()
    })

    it('renders formatted createdAt date using es-AR locale', () => {
      renderTable()

      const date1 = new Date('2024-01-15T10:00:00Z').toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      expect(screen.getByText(date1)).toBeInTheDocument()
    })
  })

  describe('role and status badges', () => {
    it('renders Spanish role badge "Admin" for admin role', () => {
      renderTable()
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    it('renders Spanish role badge "Agente" for agent role', () => {
      renderTable()
      expect(screen.getByText('Agente')).toBeInTheDocument()
    })

    it('renders Spanish status badge "Activo" for active user', () => {
      renderTable()
      expect(screen.getByText('Activo')).toBeInTheDocument()
    })

    it('renders Spanish status badge "Inactivo" for inactive user', () => {
      renderTable()
      expect(screen.getByText('Inactivo')).toBeInTheDocument()
    })
  })

  describe('action icons (Material Icons)', () => {
    it('renders Material Icon "edit" span for edit button', () => {
      renderTable()
      const editIcons = screen.getAllByText('edit')
      expect(editIcons.length).toBeGreaterThan(0)
      editIcons.forEach((icon) => expect(icon.className).toMatch(/material-icons/))
    })

    it('shows "person_off" icon for active users (deactivate action)', () => {
      renderTable()
      // alice (user-1) is active — should show person_off
      const personOffIcons = screen.getAllByText('person_off')
      expect(personOffIcons.length).toBeGreaterThan(0)
      personOffIcons.forEach((icon) => expect(icon.className).toMatch(/material-icons/))
    })

    it('shows "settings_backup_restore" icon for inactive users (reactivate action)', () => {
      renderTable()
      // bob (user-2) is inactive — should show settings_backup_restore
      const restoreIcons = screen.getAllByText('settings_backup_restore')
      expect(restoreIcons.length).toBeGreaterThan(0)
      restoreIcons.forEach((icon) => expect(icon.className).toMatch(/material-icons/))
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

      expect(screen.getByText(/no hay usuarios/i)).toBeInTheDocument()
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

    it('shows pagination text "Mostrando X-Y de Z usuarios"', () => {
      renderTable({ totalCount: 50, pageSize: 10, currentPage: 1 })

      expect(screen.getByText(/Mostrando 1-10 de 50 usuarios/)).toBeInTheDocument()
    })
  })
})
