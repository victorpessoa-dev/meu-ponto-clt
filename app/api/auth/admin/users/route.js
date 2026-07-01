import { NextResponse } from "next/server"
import {
  normalizeEmail,
  normalizePunchFields,
  normalizeSchedule,
  profileRowFromRegister,
  requireAdminUser,
  validateEmail,
  validateStrongPassword,
} from "@/lib/auth-utils"
import { sendEmail } from "@/lib/email-service"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  let createdUserId = null

  try {
    // Confirma que a requisicao veio de um administrador ativo antes de usar operacoes com Service Role.
    const admin = await requireAdminUser(request, supabaseAdmin)
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status })

    const body = await request.json()
    const name = String(body.name || "").trim()
    const email = normalizeEmail(body.email)
    const password = String(body.password || "")

    if (!name) return NextResponse.json({ error: "Informe o nome do usuario." }, { status: 400 })
    const emailError = validateEmail(email)
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 })
    const passwordError = validateStrongPassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    // Usuarios criados pelo administrador ja entram confirmados para permitir acesso imediato.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        avatar_icon: body.avatarIcon || "user",
      },
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    createdUserId = authData.user?.id
    if (!createdUserId) return NextResponse.json({ error: "Nao foi possivel criar o usuario." }, { status: 500 })

    const profile = profileRowFromRegister(
      createdUserId,
      {
        name,
        email,
        birthDate: body.birthDate || null,
        companyName: body.companyName || null,
        jobTitle: body.jobTitle || null,
        avatarIcon: body.avatarIcon || "user",
      },
      {
        isAdmin: !!body.isAdmin,
        schedule: normalizeSchedule(body.schedule),
        punchFields: normalizePunchFields(body.punchFields),
      },
    )

    const { error: profileError } = await supabaseAdmin.from("users").upsert(profile)
    if (profileError) throw profileError

    await sendEmail({
      to: email,
      template: "welcome",
      props: { name },
    })

    return NextResponse.json({ ok: true, userId: createdUserId })
  } catch (error) {
    // Se o perfil nao for salvo ou o e-mail falhar, remove o Auth criado para manter os dados consistentes.
    if (createdUserId) await supabaseAdmin.auth.admin.deleteUser(createdUserId).catch(() => {})
    return NextResponse.json({ error: error.message || "Nao foi possivel criar o usuario." }, { status: 500 })
  }
}
