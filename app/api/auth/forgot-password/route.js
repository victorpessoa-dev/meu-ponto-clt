import { NextResponse } from "next/server"
import { getSiteUrl, normalizeEmail, validateEmail } from "@/lib/auth-utils"
import { sendEmail } from "@/lib/email-service"
import { checkRateLimit, requestKey } from "@/lib/server-rate-limit"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

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

    const supabaseAdmin = getSupabaseAdmin()
    // O link de recovery e gerado no servidor e enviado por e-mail personalizado, sem expor a Service Role ao cliente.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${getSiteUrl(request)}/redefinir-senha` },
    })

    // Responde ok mesmo quando o e-mail nao existe, evitando revelar quais contas estao cadastradas.
    if (!error && data?.properties?.action_link) {
      const sent = await sendEmail({
        to: email,
        template: "reset",
        props: {
          name: data.user?.user_metadata?.name || data.user?.email?.split("@")[0],
          actionUrl: data.properties.action_link,
        },
      })
      if (sent.error) return NextResponse.json({ error: sent.error.message || "Nao foi possivel enviar o e-mail." }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nao foi possivel enviar a redefinicao de senha." }, { status: 500 })
  }
}
