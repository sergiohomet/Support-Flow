import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserRole } from '@/modules/users/schemas'
import { UserFilters } from '../UserFilters'

const mockOnSearchChange = vi.fn()
const mockOnRoleChange = vi.fn()
const mockOnActiveChange = vi.fn()
const mockOnReset = vi.fn()

function renderFilters(overrides: {
  search?: string
  role?: UserRole | null
  isActive?: boolean | null
  isLoading?: boolean
} = {}) {
  return render(
    <UserFilters
      search={overrides.search ?? ''}
      role={overrides.role ?? null}
      isActive={overrides.isActive !== undefined ? overrides.isActive : null}
      isLoading={overrides.isLoading ?? false}
      onSearchChange={mockOnSearchChange}
      onRoleChange={mockOnRoleChange}
      onActiveChange={mockOnActiveChange}
      onReset={mockOnReset}
    />,
  )
}

describe('UserFilters', () => {
  beforeEach(() => {
    mockOnSearchChange.mockReset()
    mockOnRoleChange.mockReset()
    mockOnActiveChange.mockReset()
    mockOnReset.mockReset()
  })

  describe('search input', () => {
    it('calls onSearchChange with raw string value when input changes', async () => {
      const user = userEvent.setup()
      renderFilters()

      const input = screen.getByRole('searchbox')
      await user.type(input, 'j')

      expect(mockOnSearchChange).toHaveBeenCalledOnce()
      expect(mockOnSearchChange).toHaveBeenCalledWith('j')
    })
  })

  describe('role select', () => {
    it('calls onRoleChange with the selected role value', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(
        screen.getByRole('combobox', { name: /role/i }),
        'agent',
      )

      expect(mockOnRoleChange).toHaveBeenCalledOnce()
      expect(mockOnRoleChange).toHaveBeenCalledWith('agent')
    })

    it('calls onRoleChange with null when empty option is selected', async () => {
      const user = userEvent.setup()
      renderFilters({ role: 'admin' })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /role/i }),
        '',
      )

      expect(mockOnRoleChange).toHaveBeenCalledWith(null)
    })
  })

  describe('active status select', () => {
    it('calls onActiveChange with true when active option is selected', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(
        screen.getByRole('combobox', { name: /status/i }),
        'true',
      )

      expect(mockOnActiveChange).toHaveBeenCalledOnce()
      expect(mockOnActiveChange).toHaveBeenCalledWith(true)
    })

    it('calls onActiveChange with false when inactive option is selected', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.selectOptions(
        screen.getByRole('combobox', { name: /status/i }),
        'false',
      )

      expect(mockOnActiveChange).toHaveBeenCalledWith(false)
    })

    it('calls onActiveChange with null when all option is selected', async () => {
      const user = userEvent.setup()
      renderFilters({ isActive: true })

      await user.selectOptions(
        screen.getByRole('combobox', { name: /status/i }),
        '',
      )

      expect(mockOnActiveChange).toHaveBeenCalledWith(null)
    })
  })

  describe('reset button', () => {
    it('calls onReset when reset button is clicked', async () => {
      const user = userEvent.setup()
      renderFilters()

      await user.click(screen.getByRole('button', { name: /reset/i }))

      expect(mockOnReset).toHaveBeenCalledOnce()
    })
  })

  describe('loading state', () => {
    it('disables search input when isLoading is true', () => {
      renderFilters({ isLoading: true })

      expect(screen.getByRole('searchbox')).toBeDisabled()
    })

    it('disables role select when isLoading is true', () => {
      renderFilters({ isLoading: true })

      expect(screen.getByRole('combobox', { name: /role/i })).toBeDisabled()
    })

    it('disables status select when isLoading is true', () => {
      renderFilters({ isLoading: true })

      expect(screen.getByRole('combobox', { name: /status/i })).toBeDisabled()
    })

    it('disables reset button when isLoading is true', () => {
      renderFilters({ isLoading: true })

      expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled()
    })
  })
})
