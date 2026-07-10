import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { UsersPage } from '../UsersPage'
import type { AdminUser } from '@/modules/users/schemas'

// jsdom does not implement HTMLDialogElement methods.
// Simulate open/close by toggling the `open` attribute so the
// accessibility tree is exposed (role="dialog" + child roles).
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
})

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockRefetch = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateRole = vi.fn()
const mockUpdateSpecialty = vi.fn()
const mockToggleStatus = vi.fn()
const mockLoadCategories = vi.fn()

vi.mock('@/modules/users/hooks/useListUsers', () => ({
  useListUsers: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useCreateUser', () => ({
  useCreateUser: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useUpdateUserRole', () => ({
  useUpdateUserRole: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useUpdateUserSpecialty', () => ({
  useUpdateUserSpecialty: vi.fn(),
}))
vi.mock('@/modules/users/hooks/useToggleUserStatus', () => ({
  useToggleUserStatus: vi.fn(),
}))
vi.mock('@/modules/tickets/hooks/useTicketList', () => ({
  useTicketList: vi.fn(() => ({
    isFetching: false,
    isLoadingCategories: false,
    isLoadingAgents: false,
    error: null,
    fetch: vi.fn(),
    loadCategories: mockLoadCategories,
    loadAgents: vi.fn(),
  })),
}))

// ---------------------------------------------------------------------------
// Store mock
// ---------------------------------------------------------------------------

type MockStoreState = {
  user: { id: string; email: string; full_name: string; role: 'admin' } | null
  categories: Array<{ id: string; name: string; description: string | null }>
}

let mockStoreState: MockStoreState = {
  user: { id: 'current-admin', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
  categories: [],
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
    categoryId: 'cat-1',
    categoryName: 'Backend',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    fullName: 'Bob Jones',
    avatarUrl: null,
    role: 'client',
    categoryId: null,
    categoryName: null,
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
import { useUpdateUserSpecialty } from '@/modules/users/hooks/useUpdateUserSpecialty'
import { useToggleUserStatus } from '@/modules/users/hooks/useToggleUserStatus'

function makeListUsersReturn(overrides: Partial<ReturnType<typeof useListUsers>> = {}): ReturnType<typeof useListUsers> {
  return {
    users: FAKE_USERS,
    totalCount: FAKE_USERS.length,
    isFetching: false,
    error: null,
    refetch: mockRefetch,
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

function makeUpdateSpecialtyReturn(overrides: Partial<ReturnType<typeof useUpdateUserSpecialty>> = {}): ReturnType<typeof useUpdateUserSpecialty> {
  return {
    execute: mockUpdateSpecialty,
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
    mockRefetch.mockReset()
    mockCreateUser.mockReset()
    mockUpdateRole.mockReset()
    mockUpdateSpecialty.mockReset()
    mockToggleStatus.mockReset()

    mockRefetch.mockResolvedValue(undefined)
    mockCreateUser.mockResolvedValue(true)
    mockUpdateRole.mockResolvedValue(true)
    mockUpdateSpecialty.mockResolvedValue(true)
    mockToggleStatus.mockResolvedValue(true)

    mockStoreState = {
      user: { id: 'current-admin', email: 'admin@test.com', full_name: 'Admin User', role: 'admin' },
      categories: [],
    }

    vi.mocked(useListUsers).mockClear()
    vi.mocked(useListUsers).mockReturnValue(makeListUsersReturn())
    vi.mocked(useCreateUser).mockReturnValue(makeCreateUserReturn())
    vi.mocked(useUpdateUserRole).mockReturnValue(makeUpdateRoleReturn())
    vi.mocked(useUpdateUserSpecialty).mockReturnValue(makeUpdateSpecialtyReturn())
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

  describe('on mount (sin filtros)', () => {
    it('calls useListUsers with enabled: false on mount when no filters are active', () => {
      renderPage()
      expect(vi.mocked(useListUsers)).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      )
    })

    it('shows empty-state message when no filters are active', () => {
      renderPage()
      expect(
        screen.getByText(/usá el buscador o seleccioná un filtro para ver usuarios/i),
      ).toBeInTheDocument()
    })

    it('does not render the user table when no filters are active', () => {
      renderPage()
      expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
    })
  })

  describe('user table (con filtro activo)', () => {
    it('renders UserTable with the data from useListUsers after selecting a filter', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')

      await waitFor(() => {
        expect(screen.getByText('alice@example.com')).toBeInTheDocument()
        expect(screen.getByText('bob@example.com')).toBeInTheDocument()
      })
    })
  })

  describe('filters', () => {
    it('renders UserFilters', () => {
      renderPage()
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('changing combined filter to "admin" calls useListUsers with role: "admin"', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')

      await waitFor(() => {
        expect(vi.mocked(useListUsers)).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'admin', isActive: null, enabled: true }),
        )
      })
    })

    it('changing combined filter to "inactive" calls useListUsers with isActive: false', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'inactive')

      await waitFor(() => {
        expect(vi.mocked(useListUsers)).toHaveBeenCalledWith(
          expect.objectContaining({ role: null, isActive: false, enabled: true }),
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
      mockStoreState = {
        ...mockStoreState,
        categories: [{ id: 'cat-1', name: 'Hardware', description: null }],
      }

      renderPage()

      // Activar filtro para que la tabla (y el modal) tengan sentido
      await user.selectOptions(screen.getByRole('combobox'), 'admin')

      // Open modal
      await user.click(screen.getByRole('button', { name: /nuevo usuario/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Fill in the form
      await user.type(screen.getByLabelText(/nombre completo/i), 'New User')
      await user.type(screen.getByLabelText(/^email$/i), 'new@example.com')
      await user.type(screen.getByLabelText(/contraseña temporal/i), 'password123')
      // Role defaults to 'agent', which now requires a category.
      // Scope to the CreateUserModal dialog — RoleChangeModal also renders a
      // hidden "Especialidad" select (dialogs stay mounted, only `open` toggles).
      const createDialog = screen.getByRole('dialog')
      await user.selectOptions(within(createDialog).getByLabelText('Especialidad'), 'Hardware')

      // Submit
      await user.click(within(createDialog).getByRole('button', { name: /crear usuario/i }))

      await waitFor(() => {
        expect(mockCreateUser).toHaveBeenCalled()
      })

      // After success, the list is refetched
      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('role change confirm modal', () => {
    it('opens RoleChangeModal when edit role button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')
      await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

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

      await user.selectOptions(screen.getByRole('combobox'), 'admin')
      await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

      // Click edit role on Alice (role: 'agent')
      const editButtons = screen.getAllByRole('button', { name: /edit role/i })
      await user.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cambiar rol/i })).toBeInTheDocument()
      })

      // Change select to 'admin' — scope to dialog to avoid ambiguity with UserFilters select.
      // Alice's current role is 'agent', so the category select is also visible; the role
      // select is always the first combobox in the dialog.
      const dialog = screen.getByRole('dialog')
      const [roleSelect] = within(dialog).getAllByRole('combobox')
      await user.selectOptions(roleSelect, 'admin')

      // Click confirm — scoped to dialog
      await user.click(within(dialog).getByRole('button', { name: /confirmar/i }))

      await waitFor(() => {
        expect(mockUpdateRole).toHaveBeenCalledWith('user-1', 'admin', undefined)
      })
    })
  })

  describe('specialty change modal', () => {
    it('opens SpecialtyChangeModal when edit specialty button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')
      await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

      const specialtyButtons = screen.getAllByRole('button', { name: /edit specialty/i })
      await user.click(specialtyButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cambiar especialidad/i })).toBeInTheDocument()
      })
    })

    it('calls updateSpecialty with the specialty selected in SpecialtyChangeModal', async () => {
      const user = userEvent.setup()
      mockStoreState = {
        ...mockStoreState,
        categories: [{ id: 'cat-1', name: 'Hardware', description: null }],
      }
      mockUpdateSpecialty.mockResolvedValue(true)
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')
      await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

      const specialtyButtons = screen.getAllByRole('button', { name: /edit specialty/i })
      await user.click(specialtyButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cambiar especialidad/i })).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      await user.selectOptions(within(dialog).getByRole('combobox'), 'Hardware')
      await user.click(within(dialog).getByRole('button', { name: /confirmar/i }))

      await waitFor(() => {
        expect(mockUpdateSpecialty).toHaveBeenCalledWith('user-1', 'cat-1')
      })
    })
  })

  describe('status toggle confirm modal', () => {
    it('opens ConfirmModal when deactivate button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await user.selectOptions(screen.getByRole('combobox'), 'admin')
      await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())

      const deactivateButtons = screen.getAllByRole('button', { name: /deactivate/i })
      await user.click(deactivateButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('page change', () => {
    it('calls useListUsers with new page when Pagination fires onPageChange', async () => {
      vi.mocked(useListUsers).mockReturnValue(
        makeListUsersReturn({ users: FAKE_USERS, totalCount: 50 }),
      )
      const user = userEvent.setup()
      renderPage()

      // Activar filtro para mostrar la tabla con paginación
      await user.selectOptions(screen.getByRole('combobox'), 'admin')

      // Pagination renders when totalCount(50) > pageSize(10)
      const nextButton = await screen.findByRole('button', { name: /siguiente/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(vi.mocked(useListUsers)).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 }),
        )
      })
    })
  })
})
