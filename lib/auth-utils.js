import { DEFAULT_PUNCH_FIELDS, DEFAULT_SCHEDULE, PUNCH_FIELD_OPTIONS } from "./types"
import { normalizeEmail, validateEmail, validateStrongPassword } from "./security-utils"

export { normalizeEmail, validateEmail, validateStrongPassword }

export function getSiteUrl(request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, "")
  return new URL(request.url).origin
}

export function getEmailFrom() {
  if (!process.env.EMAIL_FROM) {
    throw new Error("Configure EMAIL_FROM com um remetente verificado no Resend.")
  }

  return process.env.EMAIL_FROM
}

/**
 * Normaliza e valida os dados do cadastro antes de qualquer chamada administrativa.
 * Retorna somente campos limpos para a API usar na criacao do usuario e do perfil.
 */
export function parseRegisterPayload(body) {
  const name = String(body.name || "").trim()
  const email = normalizeEmail(body.email)
  const birthDate = String(body.birthDate || "").trim()
  const companyName = String(body.companyName || "").trim()
  const jobTitle = String(body.jobTitle || "").trim()
  const avatarIcon = String(body.avatarIcon || "user").trim() || "user"
  const password = String(body.password || "")

  if (!name) return { error: "Informe seu nome." }
  if (!birthDate) return { error: "Informe sua data de nascimento." }
  if (!companyName) return { error: "Informe o nome da empresa." }
  if (!jobTitle) return { error: "Informe sua funcao na empresa." }

  const emailError = validateEmail(email)
  if (emailError) return { error: emailError }

  const passwordError = validateStrongPassword(password)
  if (passwordError) return { error: passwordError }

  return {
    data: {
      name,
      email,
      password,
      birthDate,
      companyName,
      jobTitle,
      avatarIcon,
    },
  }
}

/**
 * Monta a linha da tabela users a partir do usuario criado no Supabase Auth.
 * Centraliza os nomes das colunas para o frontend e as rotas nao repetirem esse mapeamento.
 */
export function profileRowFromRegister(userId, data, extra = {}) {
  return {
    id: userId,
    email: data.email,
    name: data.name,
    birth_date: data.birthDate || null,
    company_name: data.companyName || null,
    job_title: data.jobTitle || null,
    avatar_icon: data.avatarIcon || "user",
    is_admin: !!extra.isAdmin,
    is_active: true,
    schedule: normalizeSchedule(extra.schedule),
    punch_fields: normalizePunchFields(extra.punchFields),
    clock_offset_minutes: 0,
    clock_offset_seconds: 0,
  }
}

/**
 * Garante uma jornada semanal com 7 posicoes em minutos.
 * Valores ausentes ou invalidos voltam para a jornada padrao do sistema.
 */
export function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return [...DEFAULT_SCHEDULE]

  return Array.from({ length: 7 }, (_, index) => {
    const minutes = Number(schedule[index])
    return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : DEFAULT_SCHEDULE[index]
  })
}

/**
 * Filtra os campos de ponto por dia e remove qualquer chave que nao exista nas opcoes permitidas.
 */
export function normalizePunchFields(punchFields) {
  const allowed = new Set(PUNCH_FIELD_OPTIONS.map((option) => option.key))
  const source = Array.isArray(punchFields) ? punchFields : DEFAULT_PUNCH_FIELDS

  return Array.from({ length: 7 }, (_, index) => {
    const fields = Array.isArray(source[index]) ? source[index] : DEFAULT_PUNCH_FIELDS[index]
    return PUNCH_FIELD_OPTIONS.map((option) => option.key).filter((key) => fields.includes(key) && allowed.has(key))
  })
}

/**
 * Le o Bearer token da requisicao, valida a sessao no Supabase e confirma se o perfil e administrador ativo.
 * As rotas administrativas usam isso antes de executar qualquer acao com Service Role.
 */
export async function requireAdminUser(request, supabaseAdmin) {
  const header = request.headers.get("authorization") || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!token) return { error: "Sessao nao informada.", status: 401 }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !authData.user) return { error: "Sessao invalida.", status: 401 }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users")
    .select("id,is_admin,is_active")
    .eq("id", authData.user.id)
    .maybeSingle()

  if (profileError) return { error: profileError.message, status: 500 }
  if (!profile?.is_active || !profile?.is_admin) return { error: "Acesso restrito a administradores.", status: 403 }

  return { user: authData.user, profile }
}
