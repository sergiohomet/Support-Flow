import { useStore } from '../index'
import type { AuthUser } from '../authSlice'

const fakeUser: AuthUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'user@example.com',
  full_name: 'Test User',
  role: 'client',
}

describe('authSlice', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useStore.setState({ user: null, isAuthReady: false })
  })

  it('has correct initial state: user=null, isAuthReady=false', () => {
    const state = useStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthReady).toBe(false)
  })

  it('setUser(profile) sets state.user to the provided profile', () => {
    useStore.getState().setUser(fakeUser)
    expect(useStore.getState().user).toEqual(fakeUser)
  })

  it('setUser(null) clears state.user to null', () => {
    // First set a user
    useStore.getState().setUser(fakeUser)
    expect(useStore.getState().user).toEqual(fakeUser)

    // Then clear it
    useStore.getState().setUser(null)
    expect(useStore.getState().user).toBeNull()
  })

  it('setAuthReady(true) sets state.isAuthReady to true', () => {
    useStore.getState().setAuthReady(true)
    expect(useStore.getState().isAuthReady).toBe(true)
  })

  it('setAuthReady(false) sets state.isAuthReady to false', () => {
    useStore.getState().setAuthReady(true)
    useStore.getState().setAuthReady(false)
    expect(useStore.getState().isAuthReady).toBe(false)
  })

  it('signOut() sets user to null and isAuthReady to true', () => {
    useStore.setState({ user: fakeUser, isAuthReady: true })
    useStore.getState().signOut()
    const state = useStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthReady).toBe(true)
  })
})
