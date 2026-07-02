/**
 * Rota server-side para solicitar redefinicao de senha.
 *
 * Aplica rate limit e usa resposta generica para nao revelar se um e-mail esta cadastrado.
 */
import { NextResponse } from "next/server"
import { getSiteUrl, normalizeEmail, validateEmail } from "@/lib/auth/auth-utils"
import { checkRateLimit, requestKey } from "@/lib/auth/server-rate-limit"
import { getSupabaseAuthServer } from "@/lib/supabase/supabase-auth-server"

export const runtime = "nodejs"

/**
 * Dispara o e-mail de recuperacao pelo Supabase Auth.
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const email = normalizeEmail(body.email)
    const emailError = validateEmail(email)
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 })

    const limit = checkRateLimit(requestKey(request, "forgot-password", email), { max: 3, windowMs: 20 * 60 * 1000 })
    if (limit.limited) {
      return NextResponse.json(
        { error: `Limite de redefinicoes atingido. Tente novamente em ${Math.ceil(limit.resetSeconds / 60)} minuto(s).` },
        { status: 429 },
      )
    }

    const supabaseAuth = getSupabaseAuthServer()

    // resetPasswordForEmail dispara o e-mail nativo do Supabase para redefinicao de senha.
    const { error: resetError } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl(request)}/redefinir-senha`,
    })
    if (resetError) {
      return NextResponse.json({ error: "Nao foi possivel enviar a redefinicao de senha agora." }, { status: 502 })
    }

    // Resposta generica para nao revelar se o e-mail existe ou nao.
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nao foi possivel enviar a redefinicao de senha." }, { status: 500 })
  }
}
