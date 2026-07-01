"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { RegisterScreen } from "@/components/auth/register-screen"
import { SplashScreen } from "@/components/app/splash-screen"

export function AuthRegisterRoute() {
  const { user, ready } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && user) router.replace("/")
  }, [ready, router, user])

  if (!ready || user) {
    return <SplashScreen />
  }

  return <RegisterScreen onSuccess={() => router.replace("/")} />
}
