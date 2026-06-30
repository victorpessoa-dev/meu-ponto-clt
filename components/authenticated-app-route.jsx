"use client"

import { Clock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { AppShell } from "@/components/app-shell"
import { RouteBlockScreen } from "@/components/route-block-screen"

export function AuthenticatedAppRoute() {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-primary pt-safe">
        <Clock className="h-8 w-8 animate-pulse text-primary-foreground" />
        <span className="sr-only">Carregando</span>
      </main>
    )
  }

  return user ? <AppShell /> : <RouteBlockScreen type="restricted" />
}
