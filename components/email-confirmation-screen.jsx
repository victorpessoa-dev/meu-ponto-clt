"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, MailCheck, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function EmailConfirmationScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const code = searchParams.get("code")
  const [status, setStatus] = useState(code ? "checking" : "waiting")
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    let timer

    async function confirmEmail() {
      const hasTokenHash = typeof window !== "undefined" && window.location.hash.includes("access_token")
      if (!code && !hasTokenHash) return

      setStatus("checking")
      setError(null)

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !cancelled) {
          setError(exchangeError.message || "Nao foi possivel confirmar o e-mail.")
          setStatus("error")
          return
        }
      }

      await supabase.auth.signOut()
      if (cancelled) return

      setStatus("confirmed")
      timer = window.setTimeout(() => router.replace("/login?emailConfirmado=1"), 3500)
    }

    confirmEmail()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [code, router])

  const Icon = status === "confirmed" ? CheckCircle2 : status === "error" ? TriangleAlert : status === "checking" ? Clock : MailCheck

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-8 top-8 h-32 rounded-full bg-positive/20 blur-3xl animate-soft-pulse" />
      <div className="w-full max-w-sm animate-fade-slide">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 animate-float">
            <Icon className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-foreground">
            {status === "confirmed" ? "E-mail confirmado" : status === "error" ? "Confirmacao pendente" : "Confirme seu e-mail"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/70">
            {status === "checking" ? "Validando o link de confirmacao" : "Meu Ponto CLT"}
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="flex flex-col gap-4 px-4 py-5 text-center sm:px-6 sm:py-6">
            {status === "waiting" && (
              <>
                <p className="text-sm leading-6 text-muted-foreground">
                  Enviamos um link de confirmacao{email ? ` para ${email}` : ""}. Abra o e-mail e clique no link para ativar sua conta.
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
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

            <Link href="/login" className={cn(buttonVariants(), "h-11 w-full")}>
              Ir para login
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
