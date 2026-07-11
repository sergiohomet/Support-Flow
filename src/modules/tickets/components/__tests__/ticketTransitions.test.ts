import { AGENT_TRANSITIONS } from '../ticketTransitions'

describe('AGENT_TRANSITIONS', () => {
  it('allows moving an open ticket to in-progress or resolved', () => {
    expect(AGENT_TRANSITIONS.abierto).toEqual(['en_proceso', 'resuelto'])
  })

  it('allows moving an in-progress ticket to resolved or back to open', () => {
    expect(AGENT_TRANSITIONS.en_proceso).toEqual(['resuelto', 'abierto'])
  })

  it('only allows a resolved ticket to be reopened', () => {
    expect(AGENT_TRANSITIONS.resuelto).toEqual(['reabierto'])
  })

  it('allows moving a reopened ticket to in-progress or resolved', () => {
    expect(AGENT_TRANSITIONS.reabierto).toEqual(['en_proceso', 'resuelto'])
  })

  it('defines transitions for every ticket status', () => {
    expect(Object.keys(AGENT_TRANSITIONS).sort()).toEqual(
      ['abierto', 'en_proceso', 'reabierto', 'resuelto'].sort()
    )
  })
})
