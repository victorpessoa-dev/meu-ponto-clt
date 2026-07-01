"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppShell } from "@/components/app-shell"
import { SplashScreen } from "@/components/splash-screen"

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
