"use client"

/**
 * Guard da rota principal autenticada.
 *
 * Mantem splash enquanto a sessao inicial carrega e redireciona visitantes para login.
 */
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { AppShell } from "@/components/app/app-shell"
import { SplashScreen } from "@/components/app/splash-screen"

/**
 * Renderiza o shell do app apenas quando existe usuario autenticado.
 */
export function AuthenticatedAppRoute() {
  const { user, ready } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !user) router.replace("/login")
  }, [ready, router, user])

  if (!ready) {
    return <SplashScreen />
  }

  return user ? <AppShell /> : <SplashScreen />
}
