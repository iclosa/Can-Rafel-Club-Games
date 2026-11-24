// Converteix qualsevol error en text llegible. Els errors de Supabase
// (`{ message, code, details }`) són objectes plans, no `Error`, i amb
// `String(e)` sortia "[object Object]".
export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown }
    if (typeof o.message === 'string' && o.message) return o.message
    if (typeof o.details === 'string' && o.details) return o.details
    try {
      return JSON.stringify(e)
    } catch {
      /* ignore */
    }
  }
  return 'Error desconegut'
}
