import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey)

if (!isSupabaseConfigured) {
  // No bloquegem l'app: només avisem. El client es deixa a null i els hooks
  // detecten la situació per no subscriure's a res.
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Falten VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env i omple els valors per habilitar el multijugador.'
  )
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    })
  : null
