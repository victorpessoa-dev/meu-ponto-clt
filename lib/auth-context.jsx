"use client"

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react"
import { supabase } from "./supabase"
import {
  getCurrentUser,
  getStoreVersion,
  initializeStore,
  isStoreReady,
  login as storeLogin,
  logout as storeLogout,
  register as storeRegister,
  requestPasswordReset as storeRequestPasswordReset,
  refreshStore,
  subscribe,
} from "./store"

const AuthContext = createContext(null)

function getSnapshot() {
  if (!isStoreReady()) return "loading"
  const u = getCurrentUser()
  return u ? JSON.stringify(u) : "none"
}

function getServerSnapshot() {
  return "loading"
}

export function AuthProvider({ children }) {
  useEffect(() => {
    initializeStore().catch(() => {
      // A loja permanece no estado padrão; o usuário verá a tela de login.
    })

    const { data } = supabase.auth.onAuthStateChange(() => {
      refreshStore().catch(() => {
        // O estado visual permanece no último cache válido.
      })
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const ready = snapshot !== "loading"

  const user = (() => {
    if (snapshot === "loading" || snapshot === "none") return null
    try {
      return JSON.parse(snapshot)
    } catch {
      return null
    }
  })()

  const login = useCallback(async (email, password) => {
    const res = await storeLogin(email, password)
    if ("error" in res) return { error: res.error }
    return null
  }, [])

  const logout = useCallback(async () => {
    await storeLogout()
  }, [])

  const register = useCallback(async (data) => {
    return storeRegister(data)
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    return storeRequestPasswordReset(email)
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, register, requestPasswordReset }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider")
  return ctx
}

export function useStoreData(selector) {
  useSyncExternalStore(subscribe, getStoreVersion, getStoreVersion)
  return selector()
}
