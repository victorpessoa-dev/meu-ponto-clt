import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Cria cliente Supabase Auth para uso no servidor sem persistir sessao.
 *
 * Mantem fluxos como signUp e resetPasswordForEmail fora do bundle do cliente.
 */
export function getSupabaseAuthServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
