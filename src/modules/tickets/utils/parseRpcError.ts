export function parseRpcError(message: string): string {
  const prefixes = [
    'unauthorized:',
    'not_found:',
    'invalid_transition:',
    'agent_limit_exceeded:',
    'invalid_agent_role:',
  ]
  for (const prefix of prefixes) {
    if (message.startsWith(prefix)) return message.slice(prefix.length).trim()
  }
  return 'Error al procesar la solicitud. Intentá de nuevo.'
}
