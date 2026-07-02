import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Cria cliente Supabase com Service Role para rotas server-side.
 *
 * Deve ser usado apenas quando a API precisa ignorar RLS de forma controlada,
 * como criar perfil apos cadastro ou atualizar senha via token validado.
 */
export function getSupabaseServiceRole() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
