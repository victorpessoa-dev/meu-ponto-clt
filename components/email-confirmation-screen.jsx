"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, MailCheck, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const PAGE_ACTIVE_LIMIT_MS = 10 * 60 * 1000
const MAX_LINK_ATTEMPTS = 3

export function EmailConfirmationScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const code = searchParams.get("code")
  const [status, setStatus] = useState(code ? "checking" : "waiting")
  const [error, setError] = useState(null)

  useEffect(() => {
    const expiresAt = Date.now() + PAGE_ACTIVE_LIMIT_MS
    const expiryTimer = window.setTimeout(() => {
      setStatus((current) => (["confirmed", "error"].includes(current) ? current : "expired"))
    }, PAGE_ACTIVE_LIMIT_MS)
    let cancelled = false
    let timer

    async function confirmEmail() {
      const hasTokenHash = typeof window !== "undefined" && window.location.hash.includes("access_token")
      if (!code && !hasTokenHash) return

      if (Date.now() > expiresAt) {
        setStatus("expired")
        return
      }

      setStatus("checking")
      setError(null)

      if (code) {
        const attemptKey = `confirm-email-attempts:${code}`
        const attempts = Number(window.sessionStorage.getItem(attemptKey) || "0")
        if (attempts >= MAX_LINK_ATTEMPTS) {
          setError("Limite de tentativas atingido para este link. Solicite um novo cadastro ou tente entrar pelo login.")
          setStatus("error")
          return
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !cancelled) {
          window.sessionStorage.setItem(attemptKey, String(attempts + 1))
          setError(exchangeError.message || "Nao foi possivel confirmar o e-mail.")
          setStatus("error")
          return
        }
        window.sessionStorage.removeItem(attemptKey)
      }

      await supabase.auth.signOut()
      if (cancelled) return

      setStatus("confirmed")
      timer = window.setTimeout(() => router.replace("/login?emailConfirmado=1"), 3500)
    }

    confirmEmail()

    return () => {
      cancelled = true
      window.clearTimeout(expiryTimer)
      if (timer) window.clearTimeout(timer)
    }
  }, [code, router])

  const Icon = status === "confirmed" ? CheckCircle2 : status === "error" || status === "expired" ? TriangleAlert : status === "checking" ? Clock : MailCheck

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary-foreground/25" />
      <div className="w-full max-w-sm animate-fade-slide">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 shadow-[0_16px_48px_rgba(0,0,0,0.12)] animate-float">
            <Icon className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-foreground">
            {status === "confirmed"
              ? "E-mail confirmado"
              : status === "error"
                ? "Confirmacao pendente"
                : status === "expired"
                  ? "Página expirada"
                  : "Confirme seu e-mail"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/70">
            {status === "checking" ? "Validando o link de confirmacao" : "Meu Ponto CLT"}
          </p>
        </div>

        <Card className="border-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:shadow-none">
          <CardContent className="flex flex-col gap-4 px-4 py-5 text-center sm:px-6 sm:py-6">
            {status === "waiting" && (
              <>
                <p className="text-sm leading-6 text-muted-foreground">
                  Enviamos um link de confirmacao{email ? ` para ${email}` : ""}. Abra o e-mail e clique no link para ativar sua conta.
                </p>
                <div className="rounded-2xl border border-border/80 bg-accent/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  Depois da confirmacao, voce sera enviado para o login. O sistema nao entra direto na conta.
                </div>
              </>
            )}

            {status === "checking" && (
              <p className="text-sm leading-6 text-muted-foreground">
                Estamos confirmando seu e-mail. Aguarde um instante.
              </p>
            )}

            {status === "confirmed" && (
              <p className="text-sm leading-6 text-muted-foreground">
                Tudo certo. Sua conta foi ativada e voce sera redirecionado para o login.
              </p>
            )}

            {status === "error" && (
              <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {error || "O link expirou ou ja foi usado. Tente entrar ou solicite um novo cadastro."}
              </p>
            )}

            {status === "expired" && (
              <p className="rounded-md border border-chart-3/30 bg-chart-3/10 px-3 py-2 text-sm text-chart-3" role="alert">
                Esta página ficou aberta por muito tempo. Abra o link novamente ou volte para o login.
              </p>
            )}

            <Link href="/login" className={cn(buttonVariants(), "h-11 w-full")}>
              Ir para login
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
