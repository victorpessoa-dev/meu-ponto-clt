import { NextResponse } from "next/server"
import { getSiteUrl, parseRegisterPayload, profileRowFromRegister } from "@/lib/auth/auth-utils"
import { checkRateLimit, requestKey } from "@/lib/auth/server-rate-limit"
import { getSupabaseServiceRole } from "@/lib/supabase/supabase-service-role"
import { getSupabaseAuthServer } from "@/lib/supabase/supabase-auth-server"

export const runtime = "nodejs"

export async function POST(request) {
  const supabaseService = getSupabaseServiceRole()
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

    const supabaseAuth = getSupabaseAuthServer()

    // signUp usa o e-mail nativo configurado no Supabase e mantem a Service Role fora do cliente.
    const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${getSiteUrl(request)}/confirmar-email`,
        data: {
          name: data.name,
          birth_date: data.birthDate,
          company_name: data.companyName,
          job_title: data.jobTitle,
          avatar_icon: data.avatarIcon,
        },
      },
    })

    if (signUpError) {
      const message = String(signUpError.message || "")
      const duplicate = /already|registered|exists|user.*exists/i.test(message)
      return NextResponse.json(
        { error: duplicate ? "Este e-mail ja esta cadastrado. Entre pelo login ou use outro e-mail." : message },
        { status: duplicate ? 409 : 400 },
      )
    }

    createdUserId = signUpData.user?.id
    if (!createdUserId) {
      return NextResponse.json({ error: "Nao foi possivel criar sua conta no Supabase." }, { status: 500 })
    }

    // O Supabase envia a confirmacao; a Service Role apenas grava o perfil usado pelo app.
    const { error: profileError } = await supabaseService.from("users").upsert(profileRowFromRegister(createdUserId, data))
    if (profileError) throw profileError

    return NextResponse.json({ ok: true, email: data.email })
  } catch (error) {
    // Se o perfil falhar depois do Auth, remove a conta recem-criada para evitar cadastro incompleto.
    if (createdUserId) await supabaseService.auth.admin.deleteUser(createdUserId).catch(() => {})
    return NextResponse.json({ error: error.message || "Nao foi possivel criar sua conta." }, { status: 500 })
  }
}
