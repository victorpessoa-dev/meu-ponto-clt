"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { LoginScreen } from "@/components/auth/login-screen"
import { SplashScreen } from "@/components/app/splash-screen"

export function AuthLoginRoute() {
  const { user, ready } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && user) router.replace("/")
  }, [ready, router, user])

  if (!ready || user) {
    return <SplashScreen />
  }

  return <LoginScreen onSuccess={() => router.replace("/")} />
}
