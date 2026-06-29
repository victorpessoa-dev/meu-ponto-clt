"use client"

import { useEffect } from "react"
import { Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { LoginScreen } from "@/components/login-screen"

export function AuthLoginRoute() {
  const { user, ready } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && user) router.replace("/")
  }, [ready, router, user])

  if (!ready || user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-primary pt-safe">
        <Clock className="h-8 w-8 animate-pulse text-primary-foreground" />
        <span className="sr-only">Carregando</span>
      </main>
    )
  }

  return <LoginScreen onSuccess={() => router.replace("/")} />
}
