import { NextResponse } from "next/server"
import { getSiteUrl, parseRegisterPayload, profileRowFromRegister } from "@/lib/auth-utils"
import { sendEmail } from "@/lib/email-service"
import { checkRateLimit, requestKey } from "@/lib/server-rate-limit"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  let createdUserId = null

  try {
    const body = await request.json()
    const parsed = parseRegisterPayload(body)
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const data = parsed.data
    const limit = checkRateLimit(requestKey(request, "register", data.email), { max: 3, windowMs: 30 * 60 * 1000 })
    if (limit.limited) {
      return NextResponse.json(
        { error: `Limite de cadastros atingido. Tente novamente em ${Math.ceil(limit.resetSeconds / 60)} minuto(s).` },
        { status: 429 },
      )
    }

    // generateLink com type "signup" cria o usuario pendente e devolve o link que sera enviado pelo Resend.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: {
        redirectTo: `${getSiteUrl(request)}/confirmar-email`,
        data: {
          name: data.name,
          birth_date: data.birthDate,
          company_name: data.companyName,
          job_title: data.jobTitle,
          avatar_icon: data.avatarIcon,
        },
      },
    })

    if (linkError) {
      const message = String(linkError.message || "")
      const duplicate = /already|registered|exists/i.test(message)
      return NextResponse.json(
        { error: duplicate ? "Este e-mail ja esta cadastrado. Entre pelo login ou use outro e-mail." : message },
        { status: duplicate ? 409 : 400 },
      )
    }

    createdUserId = linkData.user?.id
    const actionUrl = linkData.properties?.action_link
    if (!createdUserId || !actionUrl) {
      return NextResponse.json({ error: "Nao foi possivel gerar o link de confirmacao." }, { status: 500 })
    }

    // Depois que o Auth existe, salvamos o perfil publico usado pelo app para jornada, funcao e avatar.
    const { error: profileError } = await supabaseAdmin.from("users").upsert(profileRowFromRegister(createdUserId, data))
    if (profileError) throw profileError

    const sent = await sendEmail({
      to: data.email,
      template: "confirm",
      props: {
        name: data.name,
        actionUrl,
      },
    })

    if (sent.error) throw sent.error

    return NextResponse.json({ ok: true, email: data.email })
  } catch (error) {
    // Se qualquer etapa depois da criacao falhar, remove o usuario para nao deixar conta incompleta.
    if (createdUserId) await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => {})
    return NextResponse.json({ error: error.message || "Nao foi possivel criar sua conta." }, { status: 500 })
  }
}
