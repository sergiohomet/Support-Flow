import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useValidatedSubmit } from '../useValidatedSubmit'

const schema = z.object({
  email: z.string().min(1, 'El email es requerido.').email('Ingresá un email válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

describe('useValidatedSubmit', () => {
  it('valid data: calls onValid with parsed data and clears fieldErrors', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useValidatedSubmit(schema, onValid))

    act(() => {
      result.current.submit({ email: 'user@example.com', password: 'password123' })
    })

    expect(onValid).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' })
    expect(result.current.fieldErrors).toEqual({})
  })

  it('invalid data: does not call onValid and populates fieldErrors keyed by first issue per field', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useValidatedSubmit(schema, onValid))

    act(() => {
      result.current.submit({ email: '', password: 'short' })
    })

    expect(onValid).not.toHaveBeenCalled()
    expect(result.current.fieldErrors).toEqual({
      email: 'El email es requerido.',
      password: 'La contraseña debe tener al menos 8 caracteres.',
    })
  })

  it('a second valid submit after a failed one clears the prior errors', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useValidatedSubmit(schema, onValid))

    act(() => {
      result.current.submit({ email: '', password: 'short' })
    })

    expect(result.current.fieldErrors).not.toEqual({})

    act(() => {
      result.current.submit({ email: 'user@example.com', password: 'password123' })
    })

    expect(result.current.fieldErrors).toEqual({})
    expect(onValid).toHaveBeenCalledTimes(1)
    expect(onValid).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password123' })
  })

  it('reset clears fieldErrors without invoking onValid', () => {
    const onValid = vi.fn()
    const { result } = renderHook(() => useValidatedSubmit(schema, onValid))

    act(() => {
      result.current.submit({ email: '', password: 'short' })
    })

    expect(result.current.fieldErrors).not.toEqual({})

    act(() => {
      result.current.reset()
    })

    expect(result.current.fieldErrors).toEqual({})
    expect(onValid).not.toHaveBeenCalled()
  })
})
