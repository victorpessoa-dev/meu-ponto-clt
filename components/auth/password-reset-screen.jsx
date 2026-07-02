"use client"

/**
 * Tela de redefinicao de senha.
 *
 * Valida o link de recuperacao, limita tentativas na pagina e envia a nova senha
 * para a rota server-side que confirma a sessao temporaria.
 */
import { useEffect, useRef, useState } from "react"
import { CheckCircle2, Clock, KeyRound, TriangleAlert } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/supabase"
import { getPasswordChecks, validateStrongPassword } from "@/lib/auth/security-utils"
import { updateAccountPassword } from "@/lib/data/store"
import { cn } from "@/lib/utils/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PasswordField } from "@/components/auth/password-field"

const PAGE_ACTIVE_LIMIT_MS = 10 * 60 * 1000
const MAX_LINK_ATTEMPTS = 3
const MAX_PASSWORD_ATTEMPTS = 3

/**
 * Componente responsavel por concluir o fluxo de recuperacao de senha.
 */
export function PasswordResetScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get("code")
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expired, setExpired] = useState(false)
  const [passwordAttempts, setPasswordAttempts] = useState(0)
  const redirectTimerRef = useRef(null)
  const passwordChecks = getPasswordChecks(password)

  useEffect(() => {
    const expiryTimer = window.setTimeout(() => {
      setExpired(true)
      setReady(false)
      setChecking(false)
      setError("Esta página ficou aberta por muito tempo. Solicite uma nova redefinição de senha.")
    }, PAGE_ACTIVE_LIMIT_MS)

    return () => {
      window.clearTimeout(expiryTimer)
      if (redirectTimerRef.current) window.clearTimeout(redirectTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    /**
     * Troca o codigo do link por uma sessao temporaria antes de liberar o formulario.
     */
    async function prepareRecovery() {
      setChecking(true)
      setError(null)

      if (code) {
        const attemptKey = `password-reset-attempts:${code}`
        const attempts = Number(window.sessionStorage.getItem(attemptKey) || "0")
        if (attempts >= MAX_LINK_ATTEMPTS) {
          setError("Limite de tentativas atingido para este link. Solicite uma nova redefinição de senha.")
          setReady(false)
          setChecking(false)
          return
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError && !cancelled) {
          window.sessionStorage.setItem(attemptKey, String(attempts + 1))
          setError(exchangeError.message || "Nao foi possivel validar o link de redefinicao.")
          setReady(false)
          setChecking(false)
          return
        }
        window.sessionStorage.removeItem(attemptKey)
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      setReady(!!data.session)
      setChecking(false)
      if (!data.session) setError("Abra o link de redefinicao enviado para seu e-mail.")
    }

    prepareRecovery()

    return () => {
      cancelled = true
    }
  }, [code])

  /**
   * Valida a nova senha e encerra a sessao temporaria apos a atualizacao.
   */
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (expired || passwordAttempts >= MAX_PASSWORD_ATTEMPTS) {
      setReady(false)
      setError("Limite de tempo ou tentativas atingido. Solicite uma nova redefinição de senha.")
      return
    }

    /**
     * Bloqueia o formulario depois de tentativas repetidas no mesmo link.
     */
    function registerWrongAttempt(message) {
      const nextAttempts = passwordAttempts + 1
      setPasswordAttempts(nextAttempts)
      if (nextAttempts >= MAX_PASSWORD_ATTEMPTS) {
        setReady(false)
        setError("Limite de tentativas atingido. Solicite uma nova redefinição de senha.")
      } else {
        setError(`${message} Tentativa ${nextAttempts}/${MAX_PASSWORD_ATTEMPTS}.`)
      }
    }

    const passwordError = validateStrongPassword(password)
    if (passwordError) {
      registerWrongAttempt(passwordError)
      return
    }

    if (password !== confirm) {
      registerWrongAttempt("As senhas nao coincidem.")
      return
    }

    setLoading(true)
    const res = await updateAccountPassword(password)
    setLoading(false)

    if (res?.error) {
      registerWrongAttempt(res.error)
      return
    }

    setPassword("")
    setConfirm("")
    setDone(true)
    redirectTimerRef.current = window.setTimeout(() => router.replace("/login?senhaAlterada=1"), 2500)
  }

  const Icon = done ? CheckCircle2 : checking ? Clock : ready ? KeyRound : TriangleAlert

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary-foreground/25" />
      <div className="w-full max-w-sm animate-fade-slide">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 shadow-[0_16px_48px_rgba(0,0,0,0.12)] animate-float">
            <Icon className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-foreground">
            {done ? "Senha atualizada" : "Redefinir senha"}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/70">
            {checking ? "Validando o link de acesso" : "Crie uma nova senha de acesso"}
          </p>
        </div>

        <Card className="border-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:shadow-none">
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            {checking && <p className="text-center text-sm text-muted-foreground">Aguarde um instante.</p>}

            {!checking && done && (
              <div className="flex flex-col gap-4 text-center">
                <p className="text-sm leading-6 text-muted-foreground">
                  Sua senha foi atualizada. Voce sera redirecionado para o login.
                </p>
                <Link href="/login" className={cn(buttonVariants(), "h-11 w-full")}>
                  Ir para login
                </Link>
              </div>
            )}

            {!checking && !done && ready && !expired && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="rounded-2xl border border-border/80 bg-accent/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  Informe uma nova senha forte para finalizar a redefinicao.
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <PasswordField
                    id="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  {password && (
                    <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {passwordChecks.map((check) => (
                        <span key={check.key} className={check.valid ? "text-positive" : "text-muted-foreground"}>
                          {check.valid ? "OK" : "--"} {check.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <PasswordField
                    id="confirm-password"
                    autoComplete="off"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                  />
                  {confirm && (
                    <p className={cn("text-xs", password === confirm ? "text-positive" : "text-destructive")}>
                      {password === confirm ? "Senhas conferem." : "As senhas ainda nao conferem."}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" className="h-11 w-full text-base" disabled={loading || passwordAttempts >= MAX_PASSWORD_ATTEMPTS}>
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            )}

            {!checking && !done && (!ready || expired) && (
              <div className="flex flex-col gap-4 text-center">
                <p className="rounded-md border border-chart-3/30 bg-chart-3/10 px-3 py-2 text-sm text-chart-3" role="alert">
                  {error || "Link invalido ou expirado."}
                </p>
                <Link href="/login" className={cn(buttonVariants(), "h-11 w-full")}>
                  Voltar ao login
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
