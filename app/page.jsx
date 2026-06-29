"use client"

import { useEffect } from "react"
import { Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppShell } from "@/components/app-shell"

export default function Page() {
  const { user, ready } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (ready && !user) router.replace("/login")
  }, [ready, router, user])

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-primary pt-safe">
        <Clock className="h-8 w-8 animate-pulse text-primary-foreground" />
        <span className="sr-only">Carregando</span>
      </main>
    )
  }

  return user ? <AppShell /> : null
}
