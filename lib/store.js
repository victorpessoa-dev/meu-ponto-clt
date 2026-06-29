"use client"

import { supabase } from "./supabase"
import { DEFAULT_SCHEDULE } from "./types"
import { currentTime, todayISO } from "./time-utils"

const state = {
  ready: false,
  user: null,
  users: [],
  records: [],
  justifications: [],
}

const listeners = new Set()
let version = 0

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

export function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getStoreVersion() {
  return version
}

export function isStoreReady() {
  return state.ready
}

function asTime(value) {
  return value ? String(value).slice(0, 5) : null
}

function normalizeSchedule(schedule) {
  if (!Array.isArray(schedule)) return [...DEFAULT_SCHEDULE]

  return Array.from({ length: 7 }, (_, index) => {
    const minutes = Number(schedule[index])
    return Number.isFinite(minutes) && minutes >= 0 ? Math.round(minutes) : DEFAULT_SCHEDULE[index]
  })
}

function toUser(row) {
  return {
    id: row.id,
    name: row.name || row.email?.split("@")[0] || "Usuário",
    email: row.email,
    birthDate: row.birth_date,
    companyName: row.company_name || "",
    jobTitle: row.job_title || "",
    avatarIcon: row.avatar_icon || "user",
    isAdmin: !!row.is_admin,
    isActive: row.is_active !== false,
    schedule: normalizeSchedule(row.schedule),
    createdAt: row.created_at,
  }
}

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

function toJustification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    type: row.type,
    reason: row.reason || "",
    createdAt: row.created_at,
  }
}

function recordPatchToDb(patch) {
  const dbPatch = {}
  if ("entry" in patch) dbPatch.entry_time = patch.entry
  if ("breakTime" in patch) dbPatch.break_time = patch.breakTime
  if ("returnTime" in patch) dbPatch.return_time = patch.returnTime
  if ("exit" in patch) dbPatch.exit_time = patch.exit
  return dbPatch
}

async function loadDataFor(profile) {
  if (!profile) {
    state.users = []
    state.records = []
    state.justifications = []
    return
  }

  const usersQuery = profile.isAdmin
    ? supabase.from("users").select("*").order("email", { ascending: true })
    : supabase.from("users").select("*").eq("id", profile.id)

  const [usersRes, recordsRes, justificationsRes] = await Promise.all([
    usersQuery,
    supabase.from("time_records").select("*").eq("user_id", profile.id).order("date", { ascending: false }),
    supabase.from("justifications").select("*").eq("user_id", profile.id).order("date", { ascending: false }),
  ])

  if (usersRes.error) throw usersRes.error
  if (recordsRes.error) throw recordsRes.error
  if (justificationsRes.error) throw justificationsRes.error

  state.users = usersRes.data.map(toUser)
  state.records = recordsRes.data.map(toRecord)
  state.justifications = justificationsRes.data.map(toJustification)
}

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
    is_admin: false,
    is_active: true,
    schedule: DEFAULT_SCHEDULE,
  }
  const { data: inserted, error: insertError } = await supabase.from("users").insert(fallback).select("*").single()
  if (insertError) throw insertError
  return toUser(inserted)
}

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

export async function refreshStore() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error

  const profile = data.user ? await ensureProfile(data.user) : null
  if (profile && !profile.isActive) {
    await supabase.auth.signOut()
    state.user = null
    await loadDataFor(null)
    state.ready = true
    emit()
    return
  }

  state.user = profile
  await loadDataFor(state.user)
  state.ready = true
  emit()
}

export function getCurrentUser() {
  return state.user
}

export function getSessionUserId() {
  return state.user?.id ?? null
}

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: "E-mail ou senha incorretos." }

  await refreshStore()
  if (!state.user?.isActive) {
    await logout()
    return { error: "Esta conta está desativada. Contate o administrador." }
  }

  return state.user
}

export async function register(data) {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        birth_date: data.birthDate,
        company_name: data.companyName,
        job_title: data.jobTitle,
        avatar_icon: data.avatarIcon,
      },
    },
  })

  if (error) return { error: error.message || "Não foi possível criar sua conta." }

  if (authData.session && authData.user) {
    await supabase.from("users").upsert({
      id: authData.user.id,
      email: data.email,
      name: data.name,
      birth_date: data.birthDate,
      company_name: data.companyName,
      job_title: data.jobTitle,
      avatar_icon: data.avatarIcon || "user",
      is_admin: false,
      is_active: true,
      schedule: DEFAULT_SCHEDULE,
    })
    await refreshStore()
  }

  return { user: authData.user, needsConfirmation: !authData.session }
}

export async function logout() {
  await supabase.auth.signOut()
  state.user = null
  state.users = []
  state.records = []
  state.justifications = []
  state.ready = true
  emit()
}

export async function ensureSeed() {
  await initializeStore()
}

export function getUsers() {
  return state.users
}

export function getUser(id) {
  return state.users.find((u) => u.id === id) || (state.user?.id === id ? state.user : null)
}

export async function createUser(data) {
  const { data: sessionData } = await supabase.auth.getSession()
  const previousSession = sessionData.session

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        birth_date: data.birthDate,
        company_name: data.companyName,
        job_title: data.jobTitle,
        avatar_icon: data.avatarIcon || "user",
      },
    },
  })

  if (error) return { error: error.message || "Não foi possível criar o usuário." }
  if (!authData.user) return { error: "Não foi possível criar o usuário." }

  if (previousSession && authData.session?.user?.id !== previousSession.user.id) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: previousSession.access_token,
      refresh_token: previousSession.refresh_token,
    })
    if (sessionError) return { error: sessionError.message }
  }

  const row = {
    id: authData.user.id,
    email: data.email,
    name: data.name,
    birth_date: data.birthDate || null,
    company_name: data.companyName || null,
    job_title: data.jobTitle || null,
    avatar_icon: data.avatarIcon || "user",
    is_admin: !!data.isAdmin,
    is_active: true,
    schedule: normalizeSchedule(data.schedule),
  }

  const { error: profileError } = await supabase.from("users").upsert(row)
  if (profileError) return { error: profileError.message }

  await refreshStore()
  return getUser(authData.user.id)
}

export async function updateUser(id, patch) {
  const isOwnProfile = state.user?.id === id

  if (patch.password && !isOwnProfile) {
    return { error: "A senha só pode ser alterada pelo próprio usuário." }
  }

  if (patch.email && !isOwnProfile) {
    const current = getUser(id)
    if (patch.email !== current?.email) {
      return { error: "O e-mail de acesso só pode ser alterado pelo próprio usuário." }
    }
  }

  if (patch.password && state.user?.id === id) {
    const { error: passwordError } = await supabase.auth.updateUser({ password: patch.password })
    if (passwordError) return { error: passwordError.message }
  }

  if (patch.email && state.user?.id === id && patch.email !== state.user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: patch.email })
    if (emailError) return { error: emailError.message }
  }

  const dbPatch = {}
  if ("name" in patch) dbPatch.name = patch.name
  if ("email" in patch) dbPatch.email = patch.email
  if ("birthDate" in patch) dbPatch.birth_date = patch.birthDate || null
  if ("companyName" in patch) dbPatch.company_name = patch.companyName || null
  if ("jobTitle" in patch) dbPatch.job_title = patch.jobTitle || null
  if ("avatarIcon" in patch) dbPatch.avatar_icon = patch.avatarIcon || "user"
  if ("isAdmin" in patch) dbPatch.is_admin = patch.isAdmin
  if ("isActive" in patch) dbPatch.is_active = patch.isActive
  if ("schedule" in patch) dbPatch.schedule = normalizeSchedule(patch.schedule)

  const { error } = await supabase.from("users").update(dbPatch).eq("id", id)
  if (error) return { error: error.message }

  await refreshStore()
  return getUser(id)
}

export async function deactivateUser(id) {
  if (state.user?.id === id) return { error: "Você não pode desativar sua própria conta." }

  const { error } = await supabase.from("users").update({ is_active: false }).eq("id", id)
  if (error) return { error: error.message }

  await refreshStore()
  return null
}

export function getRecords() {
  return state.records
}

export function getRecord(userId, date) {
  return state.records.find((r) => r.userId === userId && r.date === date)
}

export function getMonthRecords(userId, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  return state.records.filter((r) => r.userId === userId && r.date.startsWith(prefix))
}

async function upsertRecord(userId, date, patch) {
  const payload = {
    user_id: userId,
    date,
    ...recordPatchToDb(patch),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("time_records").upsert(payload, { onConflict: "user_id,date" })
  if (error) return { error: error.message }

  await refreshStore()
  return getRecord(userId, date)
}

export async function punch(userId, field) {
  return upsertRecord(userId, todayISO(), { [field]: currentTime() })
}

export async function adjustRecord(userId, date, patch) {
  const clean = {}
  for (const [key, value] of Object.entries(patch)) {
    clean[key] = value === "" ? null : value
  }
  return upsertRecord(userId, date, clean)
}

export async function importRecords(userId, records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { error: "Nenhum registro válido para importar." }
  }

  const payload = records.map((record) => ({
    user_id: userId,
    date: record.date,
    ...recordPatchToDb({
      entry: record.entry || null,
      breakTime: record.breakTime || null,
      returnTime: record.returnTime || null,
      exit: record.exit || null,
    }),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("time_records").upsert(payload, { onConflict: "user_id,date" })
  if (error) return { error: error.message }

  await refreshStore()
  return { count: payload.length }
}

export function getJustifications() {
  return state.justifications
}

export function getJustification(userId, date) {
  return state.justifications.find((j) => j.userId === userId && j.date === date)
}

export function getMonthJustifications(userId, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`
  return state.justifications.filter((j) => j.userId === userId && j.date.startsWith(prefix))
}

export async function saveJustification(userId, date, type, reason) {
  const { error } = await supabase.from("justifications").upsert(
    {
      user_id: userId,
      date,
      type,
      reason,
    },
    { onConflict: "user_id,date" },
  )
  if (error) return { error: error.message }

  await refreshStore()
  return getJustification(userId, date)
}

export async function deleteJustification(userId, date) {
  const { error } = await supabase.from("justifications").delete().eq("user_id", userId).eq("date", date)
  if (error) return { error: error.message }

  await refreshStore()
  return null
}
