"use client"

import { useState } from "react"
import { Building2, BriefcaseBusiness, CalendarDays, Clock, MailCheck, UserRound } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { calculateAge, isAdult } from "@/lib/profile-utils"
import { getPasswordChecks, normalizeEmail, validateEmail, validateStrongPassword } from "@/lib/security-utils"
import { AvatarPicker, UserAvatar } from "@/components/avatar-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { PasswordField } from "@/components/password-field"

export function RegisterScreen() {
  const { register, verifySignupCode, resendSignupCode } = useAuth()
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
  const [pendingEmail, setPendingEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const age = calculateAge(birthDate)
  const passwordChecks = getPasswordChecks(password)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)

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

    if (!isAdult(birthDate)) {
      setError("Voce precisa ter 18 anos ou mais para usar o sistema.")
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
    setPendingEmail(cleanEmail)
    setVerificationCode("")
    setMessage(
      res?.needsConfirmation
        ? "Cadastro criado. Digite abaixo o codigo enviado para seu e-mail."
        : "Cadastro criado. Se o codigo nao chegar, verifique se a confirmacao por e-mail esta ativa no Supabase.",
    )
  }

  async function handleVerifyCode() {
    setError(null)
    setMessage(null)
    setVerifying(true)
    const res = await verifySignupCode(pendingEmail, verificationCode)
    setVerifying(false)

    if (res?.error) {
      setError(res.error)
      return
    }

    setMessage("E-mail confirmado com sucesso. Agora voce ja pode entrar com sua senha.")
    setName("")
    setBirthDate("")
    setCompanyName("")
    setJobTitle("")
    setAvatarIcon("user")
    setEmail("")
    setPendingEmail("")
    setVerificationCode("")
  }

  async function handleResendCode() {
    setError(null)
    setResending(true)
    const res = await resendSignupCode(pendingEmail)
    setResending(false)

    if (res?.error) {
      setError(res.error)
      return
    }

    setMessage("Enviamos um novo codigo para seu e-mail.")
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-8 top-8 h-32 rounded-full bg-positive/20 blur-3xl animate-soft-pulse" />
      <div className="w-full max-w-md animate-fade-slide">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 animate-float">
            <Clock className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-primary-foreground">Criar cadastro</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">Monte seu perfil de jornada</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <UserAvatar avatarIcon={avatarIcon} name={name} className="h-12 w-12" iconClassName="h-6 w-6" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{name || "Seu perfil"}</p>
                  <p className="truncate text-xs text-muted-foreground">{jobTitle || "Escolha um avatar"}</p>
                </div>
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
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-md bg-positive/10 px-3 py-2 text-sm text-positive" role="status">
                  {message}
                </p>
              )}

              {pendingEmail && (
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <MailCheck className="h-4 w-4 text-primary" />
                    Confirmar e-mail
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Digite o codigo de 6 digitos enviado para {pendingEmail}.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="verification-code">Codigo de confirmacao</Label>
                    <Input
                      id="verification-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      placeholder="000000"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      className="h-10"
                      onClick={handleVerifyCode}
                      disabled={verifying || verificationCode.length !== 6}
                    >
                      {verifying ? "Confirmando..." : "Confirmar codigo"}
                    </Button>
                    <Button type="button" variant="outline" className="h-10" onClick={handleResendCode} disabled={resending}>
                      {resending ? "Reenviando..." : "Reenviar codigo"}
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" className="mt-1 h-11 w-full text-base" disabled={loading || !!pendingEmail}>
                {loading ? "Criando..." : "Criar cadastro"}
              </Button>

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
      </div>
    </main>
  )
}
