import { NextResponse } from "next/server"
import { validateStrongPassword } from "@/lib/auth-utils"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function POST(request) {
  try {
    const body = await request.json()
    const password = String(body.password || "")
    const passwordError = validateStrongPassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const header = request.headers.get("authorization") || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : ""
    if (!token) return NextResponse.json({ error: "Sessao de redefinicao nao informada." }, { status: 401 })

    const supabaseAdmin = getSupabaseAdmin()
    // O token vem do link de recuperacao; validamos a sessao antes de trocar a senha pelo admin.
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sessao de redefinicao invalida ou expirada." }, { status: 401 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message || "Nao foi possivel atualizar a senha." }, { status: 500 })
  }
}
