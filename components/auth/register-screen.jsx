"use client"

import { useState } from "react"
import { Building2, BriefcaseBusiness, CalendarDays, Clock, KeyRound, MailCheck, UserRound } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { calculateAge, isAdult } from "@/lib/profile/profile-utils"
import { getPasswordChecks, normalizeEmail, validateEmail, validateStrongPassword } from "@/lib/auth/security-utils"
import { AvatarPicker, UserAvatar } from "@/components/settings/avatar-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { PasswordField } from "@/components/auth/password-field"
import { cn } from "@/lib/utils/utils"

const STEPS = [
  { key: "dados", label: "Dados", icon: UserRound },
  { key: "login", label: "Login", icon: KeyRound },
]

export function RegisterScreen() {
  const { register } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState("dados")
  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [avatarIcon, setAvatarIcon] = useState("user")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const age = calculateAge(birthDate)
  const passwordChecks = getPasswordChecks(password)
  const dataReady = name.trim() && birthDate && companyName.trim() && jobTitle.trim() && isAdult(birthDate)

  function goToLogin() {
    setError(null)
    if (!name.trim() || !birthDate || !companyName.trim() || !jobTitle.trim()) {
      setError("Preencha seus dados antes de continuar.")
      return
    }
    if (!isAdult(birthDate)) {
      setError("Voce precisa ter 18 anos ou mais para usar o sistema.")
      return
    }
    setStep("login")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (!dataReady) {
      setStep("dados")
      setError("Revise seus dados antes de criar o cadastro.")
      return
    }

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    const passwordError = validateStrongPassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirm) {
      setError("As senhas nao coincidem.")
      return
    }

    const cleanEmail = normalizeEmail(email)

    setLoading(true)
    const res = await register({
      name: name.trim(),
      birthDate,
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      avatarIcon,
      email: cleanEmail,
      password,
    })
    setLoading(false)

    if (res?.error) {
      setError(res.error)
      return
    }

    setPassword("")
    setConfirm("")
    setMessage("Enviamos um e-mail de confirmacao para concluir seu cadastro.")
    router.replace(`/confirmar-email?email=${encodeURIComponent(cleanEmail)}`)
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary-foreground/25" />
      <div className="w-full max-w-md animate-fade-slide">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 shadow-[0_16px_48px_rgba(0,0,0,0.12)] animate-float">
            <Clock className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-foreground">Criar cadastro</h1>
        </div>

        <Card className="border-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:shadow-none">
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {STEPS.map(({ key, label, icon: Icon }) => {
                  const active = step === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => (key === "login" ? goToLogin() : setStep("dados"))}
                      className={cn(
                        "group/step flex h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ease-out hover:shadow-sm",
                        active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 transition-transform duration-300 ease-out group-hover/step:scale-110" />
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 transition-colors duration-300 hover:bg-muted/60">
                <UserAvatar avatarIcon={avatarIcon} name={name} className="h-12 w-12" iconClassName="h-6 w-6" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{name || "Seu perfil"}</p>
                  <p className="truncate text-xs text-muted-foreground">{jobTitle || "Escolha um avatar"}</p>
                </div>
              </div>

              {step === "dados" && (
                <section className="animate-step-panel flex flex-col gap-4">
                  <div className="rounded-2xl border border-border/80 bg-accent/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    Informe seus dados profissionais. Eles ajudam a organizar jornada, relatorios e perfil.
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="name" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="birth-date">Data de nascimento</Label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="birth-date"
                          type="date"
                          className="pl-9"
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Idade</Label>
                      <div className="flex h-8 items-center justify-center rounded-md border border-input bg-muted/40 text-sm font-semibold">
                        {age ?? "--"}
                      </div>
                    </div>
                  </div>

                  {birthDate && !isAdult(birthDate) && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                      Cadastro permitido apenas para maiores de 18 anos.
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="company-name">Nome da empresa</Label>
                      <div className="relative">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="company-name"
                          className="pl-9"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="job-title">Funcao na empresa</Label>
                      <div className="relative">
                        <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="job-title"
                          className="pl-9"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Avatar do perfil</Label>
                    <AvatarPicker value={avatarIcon} onChange={setAvatarIcon} />
                  </div>

                  <Button type="button" className="h-11 w-full" onClick={goToLogin}>
                    Continuar para login
                  </Button>
                </section>
              )}

              {step === "login" && (
                <section className="animate-step-panel flex flex-col gap-4">
                  <div className="rounded-2xl border border-border/80 bg-accent/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                    Use um e-mail unico. Enviaremos uma confirmacao para ativar o cadastro.
                  </div>

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
                      name="password"
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
                    <Label htmlFor="confirm">Confirmar senha</Label>
                    <PasswordField
                      id="confirm"
                      name="password-confirmation"
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

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[0.8fr_1.2fr]">
                    <Button type="button" variant="outline" className="h-11" onClick={() => setStep("dados")}>
                      Voltar
                    </Button>
                    <Button type="submit" className="h-11 text-base" disabled={loading || !!message}>
                      {loading ? "Criando..." : "Criar cadastro"}
                    </Button>
                  </div>
                </section>
              )}

              {error && (
                <p className="animate-step-panel rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <div className="animate-step-panel flex gap-2 rounded-md bg-positive/10 px-3 py-2 text-sm text-positive" role="status">
                  <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <p className="text-center text-xs leading-5 text-muted-foreground">
                Ao criar cadastro, voce concorda com os{" "}
                <Link href="/termos-de-uso" className="font-medium text-primary underline-offset-2 hover:underline">
                  Termos de Uso
                </Link>{" "}
                e com a{" "}
                <Link href="/privacidade" className="font-medium text-primary underline-offset-2 hover:underline">
                  Politica de Privacidade
                </Link>
                .
              </p>

              <p className="text-center text-sm text-muted-foreground">
                Ja tem conta?{" "}
                <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
                  Entrar
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/58">
          Virtus Soft
        </p>
      </div>
    </main>
  )
}
