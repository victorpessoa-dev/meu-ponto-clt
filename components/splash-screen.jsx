"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function SplashScreen({ fixed = false, leaving = false }) {
  const Wrapper = fixed ? "div" : "main"

  return (
    <Wrapper
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe pb-safe pt-safe text-primary-foreground",
        fixed && "fixed inset-0 z-[2147483000]",
        leaving && "pointer-events-none opacity-0 transition-opacity duration-500 ease-out",
      )}
      aria-label="Carregando Meu Ponto CLT"
    >
      <div className="pointer-events-none absolute inset-x-10 top-16 h-40 rounded-full bg-positive/20 blur-3xl animate-soft-pulse" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-[1.65rem] bg-primary-foreground/10 p-3 shadow-2xl ring-1 ring-primary-foreground/20 animate-splash-logo sm:h-28 sm:w-28">
          <img src="/icon.svg" alt="Logo Meu Ponto CLT" className="h-full w-full rounded-[1.25rem]" />
        </div>

        <div className="mt-5 animate-splash-title">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Meu Ponto CLT</h1>
          <p className="mt-2 text-sm text-primary-foreground/68">Controle de jornada de trabalho</p>
        </div>
      </div>

      <footer className="relative pb-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/58">
        Virtus Soft
      </footer>
    </Wrapper>
  )
}

export function OpeningSplash() {
  const [visible, setVisible] = useState(true)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), 1300)
    const hideTimer = window.setTimeout(() => setVisible(false), 1800)

    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null
  return <SplashScreen fixed leaving={leaving} />
}
