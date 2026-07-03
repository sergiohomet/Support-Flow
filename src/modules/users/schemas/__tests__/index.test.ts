import { describe, it, expect } from 'vitest'
import {
  USER_ROLE,
  userRoleSchema,
  adminUserSchema,
  createUserInputSchema,
  UpdateUserRoleParamsSchema,
  ToggleUserStatusParamsSchema,
} from '../index'

describe('USER_ROLE', () => {
  it('is a const object with client, agent, admin keys', () => {
    expect(USER_ROLE.client).toBe('client')
    expect(USER_ROLE.agent).toBe('agent')
    expect(USER_ROLE.admin).toBe('admin')
  })
})

describe('userRoleSchema', () => {
  it('accepts valid roles', () => {
    expect(userRoleSchema.parse('client')).toBe('client')
    expect(userRoleSchema.parse('agent')).toBe('agent')
    expect(userRoleSchema.parse('admin')).toBe('admin')
  })

  it('rejects invalid role', () => {
    const result = userRoleSchema.safeParse('superadmin')
    expect(result.success).toBe(false)
  })
})

describe('adminUserSchema', () => {
  const validUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'user@example.com',
    fullName: 'John Doe',
    avatarUrl: null,
    role: 'agent',
    categoryId: null,
    categoryName: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  }

  it('parses a valid admin user', () => {
    const result = adminUserSchema.safeParse(validUser)
    expect(result.success).toBe(true)
  })

  it('accepts non-null avatarUrl', () => {
    const result = adminUserSchema.safeParse({ ...validUser, avatarUrl: 'https://example.com/avatar.png' })
    expect(result.success).toBe(true)
  })

  it('accepts non-null categoryId and categoryName', () => {
    const result = adminUserSchema.safeParse({ ...validUser, categoryId: 'cat-1', categoryName: 'Backend' })
    expect(result.success).toBe(true)
  })

  it('fails when required field is missing', () => {
    const { email: _, ...noEmail } = validUser
    const result = adminUserSchema.safeParse(noEmail)
    expect(result.success).toBe(false)
  })

  it('fails with invalid role', () => {
    const result = adminUserSchema.safeParse({ ...validUser, role: 'superuser' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('role')
    }
  })

  it('fails when isActive is not boolean', () => {
    const result = adminUserSchema.safeParse({ ...validUser, isActive: 'yes' })
    expect(result.success).toBe(false)
  })
})

describe('createUserInputSchema', () => {
  const validInput = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    temporaryPassword: 'secret123',
    role: 'agent',
    categoryId: 'cat-1',
  }

  it('parses valid input', () => {
    const result = createUserInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('fails when fullName is empty', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, fullName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('fullName')
    }
  })

  it('fails when email is invalid', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('email')
    }
  })

  it('fails when temporaryPassword is shorter than 8 chars', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, temporaryPassword: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('temporaryPassword')
    }
  })

  it('fails when role is client (only agent/admin allowed)', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, role: 'client' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('role')
    }
  })

  it('accepts admin role', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, role: 'admin', categoryId: null })
    expect(result.success).toBe(true)
  })

  it('accepts non-null categoryId', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, categoryId: 'cat-2' })
    expect(result.success).toBe(true)
  })

  it('fails when role is agent and categoryId is null', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, categoryId: null })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('categoryId')
    }
  })

  it('fails when role is agent and categoryId is empty string', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, categoryId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('categoryId')
    }
  })

  it('allows null categoryId when role is admin', () => {
    const result = createUserInputSchema.safeParse({ ...validInput, role: 'admin', categoryId: null })
    expect(result.success).toBe(true)
  })
})

describe('UpdateUserRoleParamsSchema', () => {
  it('parses valid params', () => {
    const result = UpdateUserRoleParamsSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newRole: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('fails with invalid role', () => {
    const result = UpdateUserRoleParamsSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      newRole: 'superuser',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('newRole')
    }
  })

  it('fails when userId is missing', () => {
    const result = UpdateUserRoleParamsSchema.safeParse({ newRole: 'admin' })
    expect(result.success).toBe(false)
  })
})

describe('ToggleUserStatusParamsSchema', () => {
  it('parses valid params', () => {
    const result = ToggleUserStatusParamsSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      isActive: false,
    })
    expect(result.success).toBe(true)
  })

  it('fails when isActive is not boolean', () => {
    const result = ToggleUserStatusParamsSchema.safeParse({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      isActive: 'no',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('isActive')
    }
  })

  it('fails when userId is missing', () => {
    const result = ToggleUserStatusParamsSchema.safeParse({ isActive: true })
    expect(result.success).toBe(false)
  })
})
