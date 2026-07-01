"use client"

import { useAuth } from "@/lib/auth-context"
import { AppShell } from "@/components/app-shell"
import { RouteBlockScreen } from "@/components/route-block-screen"
import { SplashScreen } from "@/components/splash-screen"

export function AuthenticatedAppRoute() {
  const { user, ready } = useAuth()

  if (!ready) {
    return <SplashScreen />
  }

  return user ? <AppShell /> : <RouteBlockScreen type="restricted" />
}
