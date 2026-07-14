"use client"

/**
 * Loja de dados client-side da aplicacao.
 *
 * Centraliza sessao, perfil, registros de ponto e justificativas,
 * mantendo o Supabase como fonte persistente e expondo uma API simples para os componentes.
 */
import { supabase } from "@/lib/supabase/supabase"
import { normalizeEmail, validateEmail, validateStrongPassword } from "@/lib/auth/security-utils"
import { DEFAULT_PUNCH_FIELDS, DEFAULT_SCHEDULE, PUNCH_FIELD_OPTIONS } from "@/lib/data/types"
import { currentTime, todayISO } from "@/lib/time/time-utils"

const state = {
  ready: false,
  user: null,
  users: [],
  records: [],
  justifications: [],
}

const listeners = new Set()
let version = 0
const SELECT_PAGE_SIZE = 1000
const UPSERT_CHUNK_SIZE = 500
const DATA_CACHE_TTL_MS = 30 * 1000

const dataCache = {
  userId: null,
  expiresAt: 0,
  users: [],
  records: [],
  justifications: [],
  inFlight: null,
}

/**
 * Notifica assinantes React sempre que a loja muda.
 */
function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

/**
 * Invalida o cache de leitura usado para evitar consultas duplicadas em uma mesma sessao.
 */
function clearDataCache() {
  dataCache.userId = null
  dataCache.expiresAt = 0
  dataCache.users = []
  dataCache.records = []
  dataCache.justifications = []
  dataCache.inFlight = null
}

/**
 * Substitui os dados carregados por um snapshot consistente vindo do Supabase.
 */
function applyDataSnapshot(snapshot) {
  state.users = snapshot.users
  state.records = snapshot.records
  state.justifications = snapshot.justifications
}

/**
 * Remove dados sensiveis da memoria quando nao ha usuario autenticado.
 */
function clearLoadedData() {
  state.users = []
  state.records = []
  state.justifications = []
  clearDataCache()
}

/**
 * Registra um listener para integracao com useSyncExternalStore.
 *
 * @param {Function} cb Callback chamado quando a loja mudar.
 * @returns {Function} Funcao de cancelamento da assinatura.
 */
export function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/**
 * Retorna a versao incremental da loja para disparar atualizacoes reativas.
 */
export function getStoreVersion() {
  return version
}

/**
 * Indica se a primeira verificacao de sessao ja foi concluida.
 */
export function isStoreReady() {
  return state.ready
}

/**
 * Normaliza horarios vindos do banco para o formato HH:MM usado na interface.
 */
function asTime(value) {
  return value ? String(value).slice(0, 5) : null
}

/**
 * Garante uma jornada semanal com sete dias e valores em minutos.
 */
function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return [...DEFAULT_SCHEDULE]

  return Array.from({ length: 7 }, (_, index) => {
    const minutes = Number(schedule[index])
    return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : DEFAULT_SCHEDULE[index]
  })
}

/**
 * Mantem apenas campos de ponto suportados e na ordem definida pelo produto.
 */
function normalizePunchFields(punchFields) {
  const allowed = new Set(PUNCH_FIELD_OPTIONS.map((option) => option.key))
  const source = Array.isArray(punchFields) ? punchFields : DEFAULT_PUNCH_FIELDS

  return Array.from({ length: 7 }, (_, index) => {
    const fields = Array.isArray(source[index]) ? source[index] : DEFAULT_PUNCH_FIELDS[index]
    return PUNCH_FIELD_OPTIONS.map((option) => option.key).filter((key) => fields.includes(key) && allowed.has(key))
  })
}

/**
 * Converte a linha users do Supabase para o modelo consumido pela aplicacao.
 */
function toUser(row) {
  return {
    id: row.id,
    name: row.name || row.email?.split("@")[0] || "Usuário",
    email: row.email,
    birthDate: row.birth_date,
    companyName: row.company_name || "",
    jobTitle: row.job_title || "",
    avatarIcon: row.avatar_icon || "user",
    isActive: row.is_active !== false,
    schedule: normalizeSchedule(row.schedule),
    punchFields: normalizePunchFields(row.punch_fields),
    onboardingState: Number.isInteger(Number(row.onboarding_state)) ? Number(row.onboarding_state) : 0,
    clockOffsetMinutes: Number.isFinite(Number(row.clock_offset_minutes)) ? Number(row.clock_offset_minutes) : 0,
    clockOffsetSeconds: Number.isFinite(Number(row.clock_offset_seconds))
      ? Number(row.clock_offset_seconds)
      : Number.isFinite(Number(row.clock_offset_minutes))
        ? Number(row.clock_offset_minutes) * 60
        : 0,
    createdAt: row.created_at,
  }
}

/**
 * Converte registros de ponto do banco para nomes de campo do frontend.
 */
function toRecord(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    entry: asTime(row.entry_time),
    breakTime: asTime(row.break_time),
    returnTime: asTime(row.return_time),
    exit: asTime(row.exit_time),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Converte justificativas do banco para o modelo usado nos calculos de banco de horas.
 */
function toJustification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    type: row.type,
    reason: row.reason || "",
    startTime: asTime(row.start_time),
    endTime: asTime(row.end_time),
    createdAt: row.created_at,
  }
}

/**
 * Traduz atualizacoes parciais de ponto para os nomes de coluna do Supabase.
 */
function recordPatchToDb(patch) {
  const dbPatch = {}
  if ("entry" in patch) dbPatch.entry_time = patch.entry
  if ("breakTime" in patch) dbPatch.break_time = patch.breakTime
  if ("returnTime" in patch) dbPatch.return_time = patch.returnTime
  if ("exit" in patch) dbPatch.exit_time = patch.exit
  return dbPatch
}

/**
 * Busca todas as paginas de uma consulta Supabase.
 *
 * @param {Function} queryFactory Fabrica que retorna a consulta base.
 * @returns {Promise<Array>}
 */
async function selectAll(queryFactory) {
  const rows = []

  for (let from = 0; ; from += SELECT_PAGE_SIZE) {
    const to = from + SELECT_PAGE_SIZE - 1
    const { data, error } = await queryFactory().range(from, to)
    if (error) throw error

    rows.push(...(data || []))
    if (!data || data.length < SELECT_PAGE_SIZE) break
  }

  return rows
}

/**
 * Carrega perfil, pontos e justificativas do usuario autenticado em paralelo.
 */
async function fetchDataSnapshot(profile) {
  const usersQuery = supabase.from("users").select("*").eq("id", profile.id)

  const [usersRes, recordsRows, justificationRows] = await Promise.all([
    usersQuery,
    selectAll(() => supabase.from("time_records").select("*").eq("user_id", profile.id).order("date", { ascending: false })),
    selectAll(() => supabase.from("justifications").select("*").eq("user_id", profile.id).order("date", { ascending: false })),
  ])

  if (usersRes.error) throw usersRes.error

  return {
    users: usersRes.data.map(toUser),
    records: recordsRows.map(toRecord),
    justifications: justificationRows.map(toJustification),
  }
}

/**
 * Atualiza a loja para o perfil informado, reutilizando cache curto quando permitido.
 */
async function loadDataFor(profile, { force = false } = {}) {
  if (!profile) {
    clearLoadedData()
    return
  }

  const now = Date.now()
  const cacheIsFresh = dataCache.userId === profile.id && dataCache.expiresAt > now

  if (!force && cacheIsFresh) {
    applyDataSnapshot(dataCache)
    return
  }

  if (!force && dataCache.inFlight?.userId === profile.id) {
    applyDataSnapshot(await dataCache.inFlight.promise)
    return
  }

  // Cache curto: evita leituras duplicadas em eventos de auth, mas escritas sempre forcam recarga.
  const promise = fetchDataSnapshot(profile)
  dataCache.inFlight = { userId: profile.id, promise }

  try {
    const snapshot = await promise
    dataCache.userId = profile.id
    dataCache.expiresAt = Date.now() + DATA_CACHE_TTL_MS
    dataCache.users = snapshot.users
    dataCache.records = snapshot.records
    dataCache.justifications = snapshot.justifications
    applyDataSnapshot(snapshot)
  } finally {
    if (dataCache.inFlight?.promise === promise) dataCache.inFlight = null
  }
}

/**
 * Garante que todo usuario autenticado no Supabase Auth tenha uma linha de perfil no app.
 */
async function ensureProfile(authUser) {
  if (!authUser) return null

  const { data, error } = await supabase.from("users").select("*").eq("id", authUser.id).maybeSingle()
  if (error) throw error

  if (data) return toUser(data)

  const fallback = {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Usuário",
    birth_date: authUser.user_metadata?.birth_date || null,
    company_name: authUser.user_metadata?.company_name || null,
    job_title: authUser.user_metadata?.job_title || null,
    avatar_icon: authUser.user_metadata?.avatar_icon || "user",
    is_active: true,
    schedule: DEFAULT_SCHEDULE,
    punch_fields: DEFAULT_PUNCH_FIELDS,
    clock_offset_minutes: 0,
    clock_offset_seconds: 0,
  }
  const { data: inserted, error: insertError } = await supabase.from("users").insert(fallback).select("*").single()
  if (insertError) throw insertError
  return toUser(inserted)
}

/**
 * Inicializa sessao, perfil e dados antes da primeira renderizacao autenticada.
 */
export async function initializeStore() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error

    const profile = data.user ? await ensureProfile(data.user) : null
    if (profile && !profile.isActive) {
      await supabase.auth.signOut()
      state.user = null
      await loadDataFor(null)
      return
    }

    state.user = profile
    await loadDataFor(state.user)
  } finally {
    state.ready = true
    emit()
  }
}

/**
 * Revalida a sessao atual e recarrega dados apos eventos de auth ou escritas.
 */
export async function refreshStore({ force = false } = {}) {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error

  const profile = data.user ? await ensureProfile(data.user) : null
  if (profile && !profile.isActive) {
    await supabase.auth.signOut()
    state.user = null
    await loadDataFor(null, { force: true })
    state.ready = true
    emit()
    return
  }

  state.user = profile
  await loadDataFor(state.user, { force })
  state.ready = true
  emit()
}

/**
 * Retorna o usuario ativo em memoria.
 */
export function getCurrentUser() {
  return state.user
}

/**
 * Retorna o ID do usuario autenticado sem expor o objeto completo.
 */
export function getSessionUserId() {
  return state.user?.id ?? null
}

/**
 * Autentica o usuario e bloqueia contas marcadas como inativas no perfil.
 */
export async function login(email, password) {
  const cleanEmail = normalizeEmail(email)
  const emailError = validateEmail(cleanEmail)
  if (emailError) return { error: emailError }

  const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) return { error: "E-mail ou senha incorretos." }

  await refreshStore()
  if (!state.user?.isActive) {
    await logout()
    return { error: "Esta conta está desativada. Contate o suporte." }
  }

  return state.user
}

/**
 * Solicita redefinicao de senha pela rota server-side para aplicar rate limit.
 */
export async function requestPasswordReset(email) {
  const cleanEmail = normalizeEmail(email)
  const emailError = validateEmail(cleanEmail)
  if (emailError) return { error: emailError }

  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cleanEmail }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) return { error: payload.error || "Nao foi possivel enviar a redefinicao de senha." }
  return { ok: true }
}

/**
 * Atualiza a senha usando a sessao temporaria recebida pelo link de recuperacao.
 */
export async function updateAccountPassword(password) {
  const passwordError = validateStrongPassword(password)
  if (passwordError) return { error: passwordError }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) return { error: "Sessao de redefinicao expirada. Solicite um novo link." }

  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ password }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) return { error: payload.error || "Nao foi possivel atualizar a senha." }

  await supabase.auth.signOut()
  state.user = null
  clearLoadedData()
  state.ready = true
  emit()
  return { ok: true }
}

/**
 * Cria cadastro via API interna para manter chaves privilegiadas fora do cliente.
 */
export async function register(data) {
  const cleanEmail = normalizeEmail(data.email)
  const emailError = validateEmail(cleanEmail)
  if (emailError) return { error: emailError }

  const passwordError = validateStrongPassword(data.password)
  if (passwordError) return { error: passwordError }

  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name,
      birthDate: data.birthDate,
      companyName: data.companyName,
      jobTitle: data.jobTitle,
      avatarIcon: data.avatarIcon,
      email: cleanEmail,
      password: data.password,
    }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) return { error: payload.error || "Nao foi possivel criar sua conta." }

  return { email: cleanEmail, needsConfirmation: true }
}

/**
 * Encerra a sessao e limpa dados carregados da memoria.
 */
export async function logout() {
  await supabase.auth.signOut()
  state.user = null
  clearLoadedData()
  state.ready = true
  emit()
}

/**
 * Mantem compatibilidade com inicializadores antigos que esperavam uma carga inicial.
 */
export async function ensureSeed() {
  await initializeStore()
}

/**
 * Localiza um usuario carregado, incluindo o proprio usuario da sessao.
 */
export function getUser(id) {
  return state.users.find((u) => u.id === id) || (state.user?.id === id ? state.user : null)
}

/**
 * Atualiza dados de perfil, login, jornada e relogio do usuario.
 *
 * Regras de negocio:
 * - senha e e-mail de acesso so podem ser alterados pelo proprio usuario;
 * - ajustes de relogio ficam limitados a uma janela de 12 horas;
 * - jornada e campos de ponto sao normalizados antes de persistir.
 */
export async function updateUser(id, patch) {
  const isOwnProfile = state.user?.id === id
  const cleanEmail = patch.email ? normalizeEmail(patch.email) : patch.email

  if (patch.password && !isOwnProfile) {
    return { error: "A senha só pode ser alterada pelo próprio usuário." }
  }

  if (patch.password) {
    const passwordError = validateStrongPassword(patch.password)
    if (passwordError) return { error: passwordError }
  }

  if (cleanEmail) {
    const emailError = validateEmail(cleanEmail)
    if (emailError) return { error: emailError }
  }

  if (cleanEmail && !isOwnProfile) {
    const current = getUser(id)
    if (cleanEmail !== current?.email) {
      return { error: "O e-mail de acesso só pode ser alterado pelo próprio usuário." }
    }
  }

  if (patch.password && state.user?.id === id) {
    const { error: passwordError } = await supabase.auth.updateUser({ password: patch.password })
    if (passwordError) return { error: passwordError.message }
  }

  if (cleanEmail && state.user?.id === id && cleanEmail !== state.user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: cleanEmail })
    if (emailError) return { error: emailError.message }
  }

  const dbPatch = {}
  if ("name" in patch) dbPatch.name = patch.name
  if ("email" in patch) dbPatch.email = cleanEmail
  if ("birthDate" in patch) dbPatch.birth_date = patch.birthDate || null
  if ("companyName" in patch) dbPatch.company_name = patch.companyName || null
  if ("jobTitle" in patch) dbPatch.job_title = patch.jobTitle || null
  if ("avatarIcon" in patch) dbPatch.avatar_icon = patch.avatarIcon || "user"
  if ("isActive" in patch) dbPatch.is_active = patch.isActive
  if ("schedule" in patch) dbPatch.schedule = normalizeSchedule(patch.schedule)
  if ("punchFields" in patch) dbPatch.punch_fields = normalizePunchFields(patch.punchFields)
  if ("onboardingState" in patch) {
    const state = Number(patch.onboardingState)
    dbPatch.onboarding_state = [0, 1, 2].includes(state) ? state : 0
  }
  if ("clockOffsetMinutes" in patch) {
    const offset = Number(patch.clockOffsetMinutes)
    dbPatch.clock_offset_minutes = Number.isFinite(offset) ? Math.max(-720, Math.min(720, Math.round(offset))) : 0
  }
  if ("clockOffsetSeconds" in patch) {
    const offset = Number(patch.clockOffsetSeconds)
    const seconds = Number.isFinite(offset) ? Math.max(-43200, Math.min(43200, Math.round(offset))) : 0
    dbPatch.clock_offset_seconds = seconds
    dbPatch.clock_offset_minutes = Math.trunc(seconds / 60)
  }

  const { error } = await supabase.from("users").update(dbPatch).eq("id", id)
  if (error) return { error: error.message }

  clearDataCache()
  await refreshStore({ force: true })
  return getUser(id)
}

/**
 * Retorna todos os registros de ponto carregados.
 */
export function getRecords() {
  return state.records
}

/**
 * Busca o ponto de um usuario em uma data especifica.
 */
export function getRecord(userId, date) {
  return state.records.find((r) => r.userId === userId && r.date === date)
}

/**
 * Filtra pontos por usuario e mes usando datas ISO.
 */
export function getMonthRecords(userId, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  return state.records.filter((r) => r.userId === userId && r.date.startsWith(prefix))
}

/**
 * Insere ou atualiza o ponto de um dia mantendo unicidade por usuario e data.
 */
async function upsertRecord(userId, date, patch) {
  const payload = {
    user_id: userId,
    date,
    ...recordPatchToDb(patch),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("time_records").upsert(payload, { onConflict: "user_id,date" })
  if (error) return { error: error.message }

  clearDataCache()
  await refreshStore({ force: true })
  return getRecord(userId, date)
}

/**
 * Registra uma batida no dia atual usando o relogio configurado da empresa.
 */
export async function punch(userId, field) {
  const offset = state.user?.id === userId ? state.user.clockOffsetSeconds ?? state.user.clockOffsetMinutes * 60 : 0
  return upsertRecord(userId, todayISO(), { [field]: currentTime(offset) })
}

/**
 * Ajusta manualmente o ponto de uma data.
 *
 * Se todos os horarios forem removidos, o registro inteiro e excluido para nao manter linhas vazias.
 */
export async function adjustRecord(userId, date, patch) {
  if (date > todayISO()) {
    return { error: "Não é permitido ajustar o ponto de uma data futura." }
  }

  const clean = {}
  for (const [key, value] of Object.entries(patch)) {
    clean[key] = value === "" ? null : value
  }

  if (!clean.entry && !clean.breakTime && !clean.returnTime && !clean.exit) {
    const { error } = await supabase.from("time_records").delete().eq("user_id", userId).eq("date", date)
    if (error) return { error: error.message }

    clearDataCache()
    await refreshStore({ force: true })
    return null
  }

  return upsertRecord(userId, date, clean)
}

/**
 * Importa pontos de planilha em lotes para evitar payloads grandes no Supabase.
 */
export async function importRecords(userId, records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { error: "Nenhum registro válido para importar." }
  }

  const updatedAt = new Date().toISOString()
  const byDate = new Map()

  records.forEach((record) => {
    if (!record?.date) return

    if (!(record.entry || record.breakTime || record.returnTime || record.exit)) return

    byDate.set(record.date, {
      user_id: userId,
      date: record.date,
      ...recordPatchToDb({
        entry: record.entry || null,
        breakTime: record.breakTime || null,
        returnTime: record.returnTime || null,
        exit: record.exit || null,
      }),
      updated_at: updatedAt,
    })
  })

  const payload = Array.from(byDate.values())
  if (payload.length === 0) {
    return { error: "Nenhum registro valido para importar." }
  }

  for (let index = 0; index < payload.length; index += UPSERT_CHUNK_SIZE) {
    const chunk = payload.slice(index, index + UPSERT_CHUNK_SIZE)
    const { error } = await supabase.from("time_records").upsert(chunk, { onConflict: "user_id,date" })
    if (error) return { error: error.message }
  }

  clearDataCache()
  await refreshStore({ force: true })

  const dates = payload.map((record) => record.date).sort()
  return {
    count: payload.length,
    firstDate: dates[0],
    latestDate: dates[dates.length - 1],
  }
}

/**
 * Retorna todas as justificativas carregadas.
 */
export function getJustifications() {
  return state.justifications
}

/**
 * Busca justificativa de um usuario em uma data especifica.
 */
export function getJustification(userId, date) {
  return state.justifications.find((j) => j.userId === userId && j.date === date)
}

/**
 * Filtra justificativas por usuario e mes.
 */
export function getMonthJustifications(userId, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  return state.justifications.filter((j) => j.userId === userId && j.date.startsWith(prefix))
}

/**
 * Cria ou atualiza a justificativa de uma data.
 *
 * A restricao user_id/date garante uma unica justificativa por dia.
 */
export async function saveJustification(userId, date, type, reason, options = {}) {
  const { error } = await supabase.from("justifications").upsert(
    {
      user_id: userId,
      date,
      type,
      reason,
      start_time: options.startTime || null,
      end_time: options.endTime || null,
    },
    { onConflict: "user_id,date" },
  )
  if (error) return { error: error.message }

  clearDataCache()
  await refreshStore({ force: true })
  return getJustification(userId, date)
}

/**
 * Remove a justificativa de uma data e revalida os calculos dependentes.
 */
export async function deleteJustification(userId, date) {
  const { error } = await supabase.from("justifications").delete().eq("user_id", userId).eq("date", date)
  if (error) return { error: error.message }

  clearDataCache()
  await refreshStore({ force: true })
  return null
}
