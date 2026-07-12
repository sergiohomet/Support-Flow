import { parseRpcError } from '../parseRpcError'

describe('parseRpcError', () => {
  it('extracts the friendly message for the already_assigned: prefix', () => {
    const message = 'already_assigned: Este ticket ya fue tomado por otro agente'

    expect(parseRpcError(message)).toBe('Este ticket ya fue tomado por otro agente')
  })

  it('extracts the friendly message for the category_mismatch: prefix', () => {
    const message =
      'category_mismatch: El agente no tiene la especialidad requerida para este ticket'

    expect(parseRpcError(message)).toBe(
      'El agente no tiene la especialidad requerida para este ticket',
    )
  })

  it('falls back to the generic message for an unknown prefix', () => {
    const message = 'some_unknown_prefix: something went wrong'

    expect(parseRpcError(message)).toBe('Error al procesar la solicitud. Intentá de nuevo.')
  })
})
