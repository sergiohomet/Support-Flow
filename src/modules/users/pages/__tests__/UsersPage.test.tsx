import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UsersPage } from '../UsersPage'
import type { AdminUser } from '@/modules/users/schemas'

// jsdom does not implement HTMLDialogElement methods
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn()
})

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateRole = vi.fn()
const mockToggleStatus = vi.fn()

vi.mock('@/modules/users/hooks/useListUsers', () => ({
  useListUsers: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useCreateUser', () => ({
  useCreateUser: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useUpdateUserRole', () => ({
  useUpdateUserRole: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useToggleUserStatus', () => ({
  useToggleUserStatus: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Store mock
// ---------------------------------------------------------------------------

type MockStoreState = {
  user: { id: string; email: string; full_name: string; role: 'admin' } | null
}

let mockStoreState: MockStoreState = {
  user: { id: 'current-admin', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
}

vi.mock('@/store', () => ({
  useStore: vi.fn((selector: (s: MockStoreState) => unknown) => selector(mockStoreState)),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_USERS: AdminUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    fullName: 'Alice Smith',
    avatarUrl: null,
    role: 'agent',
    specialty: 'Backend',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    fullName: 'Bob Jones',
    avatarUrl: null,
    role: 'client',
    specialty: null,
    isActive: false,
    createdAt: '2024-02-20T12:00:00Z',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { useListUsers } from '@/modules/users/hooks/useListUsers'
import { useCreateUser } from '@/modules/users/hooks/useCreateUser'
import { useUpdateUserRole } from '@/modules/users/hooks/useUpdateUserRole'
import { useToggleUserStatus } from '@/modules/users/hooks/useToggleUserStatus'

function makeListUsersReturn(overrides: Partial<ReturnType<typeof useListUsers>> = {}): ReturnType<typeof useListUsers> {
  return {
    users: FAKE_USERS,
    totalCount: FAKE_USERS.length,
    isFetching: false,
    error: null,
    fetch: mockFetch,
    ...overrides,
  }
}

function makeCreateUserReturn(overrides: Partial<ReturnType<typeof useCreateUser>> = {}): ReturnType<typeof useCreateUser> {
  return {
    execute: mockCreateUser,
    isLoading: false,
    error: null,
    ...overrides,
  }
}

function makeUpdateRoleReturn(overrides: Partial<ReturnType<typeof useUpdateUserRole>> = {}): ReturnType<typeof useUpdateUserRole> {
  return {
    execute: mockUpdateRole,
    isLoading: false,
    error: null,
    ...overrides,
  }
}

function makeToggleStatusReturn(overrides: Partial<ReturnType<typeof useToggleUserStatus>> = {}): ReturnType<typeof useToggleUserStatus> {
  return {
    execute: mockToggleStatus,
    isLoading: false,
    error: null,
    ...overrides,
  }
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UsersPage', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockCreateUser.mockReset()
    mockUpdateRole.mockReset()
    mockToggleStatus.mockReset()

    mockFetch.mockResolvedValue(undefined)
    mockCreateUser.mockResolvedValue(true)
    mockUpdateRole.mockResolvedValue(true)
    mockToggleStatus.mockResolvedValue(true)

    mockStoreState = {
      user: { id: 'current-admin', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
    }

    vi.mocked(useListUsers).mockReturnValue(makeListUsersReturn())
    vi.mocked(useCreateUser).mockReturnValue(makeCreateUserReturn())
    vi.mocked(useUpdateUserRole).mockReturnValue(makeUpdateRoleReturn())
    vi.mocked(useToggleUserStatus).mockReturnValue(makeToggleStatusReturn())
  })

  describe('header', () => {
    it('renders the page heading "Usuarios"', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: /^Usuarios$/i })).toBeInTheDocument()
    })

    it('renders the subtitle text', () => {
      renderPage()
      expect(
        screen.getByText('Gestiona los accesos y roles de tu equipo y clientes.'),
      ).toBeInTheDocument()
    })

    it('renders "Nuevo Usuario" button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /nuevo usuario/i })).toBeInTheDocument()
    })
  })

  describe('on mount', () => {
    it('calls fetch with default params on mount', async () => {
      renderPage()
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith({
          search: null,
          page: 1,
          pageSize: 10,
          role: null,
          isActive: null,
        })
      })
    })
  })

  describe('user table', () => {
    it('renders UserTable with the data from useListUsers', () => {
      renderPage()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })
  })

  describe('filters', () => {
    it('renders UserFilters', () => {
      renderPage()
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('changing combined filter to "admin" calls fetch with p_role: "admin"', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'admin', isActive: null }),
        )
      })
    })

    it('changing combined filter to "inactive" calls fetch with isActive: false', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'inactive')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({ role: null, isActive: false }),
        )
      })
    })
  })

  describe('create user modal', () => {
    it('opens CreateUserModal when "Nuevo Usuario" button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole('button', { name: /nuevo usuario/i }))

      // The modal dialog should appear
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('closes modal and re-fetches list after successful user creation', async () => {
      const user = userEvent.setup()
      mockCreateUser.mockResolvedValue(true)
      vi.mocked(useCreateUser).mockReturnValue(makeCreateUserReturn({ execute: mockCreateUser }))

      renderPage()

      // Open modal
      await user.click(screen.getByRole('button', { name: /nuevo usuario/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Fill in the form
      await user.type(screen.getByLabelText(/full name/i), 'New User')
      await user.type(screen.getByLabelText(/^email$/i), 'new@example.com')
      await user.type(screen.getByLabelText(/temporary password/i), 'password123')

      // Submit
      await user.click(screen.getByRole('button', { name: /create user/i }))

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalled()
      })

      // After success, fetch is called again
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('role change confirm modal', () => {
    it('opens RoleChangeModal when edit role button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      const editButtons = screen.getAllByRole('button', { name: /edit role/i })
      await user.click(editButtons[0])

      // RoleChangeModal should open with "Cambiar rol" title
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cambiar rol/i })).toBeInTheDocument()
      })
    })

    it('calls updateRole with the role selected in RoleChangeModal', async () => {
      const user = userEvent.setup()
      mockUpdateRole.mockResolvedValue(true)
      renderPage()

      // Click edit role on Alice (role: 'agent')
      const editButtons = screen.getAllByRole('button', { name: /edit role/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cambiar rol/i })).toBeInTheDocument()
      })

      // Change select to 'admin' — scope to dialog to avoid ambiguity with UserFilters select
      const dialog = screen.getByRole('dialog')
      await user.selectOptions(within(dialog).getByRole('combobox'), 'admin')

      // Click confirm — scoped to dialog
      await user.click(within(dialog).getByRole('button', { name: /confirmar/i }))

      await waitFor(() => {
        expect(mockUpdateRole).toHaveBeenCalledWith('user-1', 'admin')
      })
    })
  })

  describe('status toggle confirm modal', () => {
    it('opens ConfirmModal when deactivate button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('page change', () => {
    it('calls fetch with new page when Pagination fires onPageChange', async () => {
      vi.mocked(useListUsers).mockReturnValue(
        makeListUsersReturn({ users: FAKE_USERS, totalCount: 50 }),
      )
      const user = userEvent.setup()
      renderPage()

      // Pagination renders when totalCount(50) > pageSize(10)
      const nextButton = await screen.findByRole('button', { name: /siguiente/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 }),
        )
      })
    })
  })
})
