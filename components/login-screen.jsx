"use client"

import { useState } from "react"
import { Clock } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { PasswordField } from "@/components/password-field"

export function LoginScreen({ onSuccess }) {
  const { login } = useAuth()
  const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD
  const showDemoLogin = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN === "true" && demoEmail && demoPassword
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await login(email.trim(), password)
    setLoading(false)
    if (res?.error) setError(res.error)
    else onSuccess?.()
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-8 top-8 h-32 rounded-full bg-positive/20 blur-3xl animate-soft-pulse" />
      <div className="w-full max-w-sm animate-fade-slide">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 animate-float">
            <Clock className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-foreground">Meu Ponto CLT</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">Controle de jornada de trabalho</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordField
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="mt-1 h-11 w-full text-base" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Não tem conta?{" "}
                <Link href="/cadastro" className="font-medium text-primary underline-offset-2 hover:underline">
                  Criar cadastro
                </Link>
              </p>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <Link href="/privacidade" className="underline-offset-2 hover:text-primary hover:underline">
                  Privacidade
                </Link>
                <Link href="/termos-de-uso" className="underline-offset-2 hover:text-primary hover:underline">
                  Termos
                </Link>
                <Link href="/compliance-de-dados" className="underline-offset-2 hover:text-primary hover:underline">
                  Compliance
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {showDemoLogin && (
          <div className="mt-6 rounded-lg bg-primary-foreground/10 px-4 py-3 text-center text-xs leading-relaxed text-primary-foreground/70">
            Acesso de demonstração (admin):
            <br />
            <span className="font-medium text-primary-foreground">{demoEmail}</span> / senha{" "}
            <span className="font-medium text-primary-foreground">{demoPassword}</span>
          </div>
        )}
      </div>
    </main>
  )
}
