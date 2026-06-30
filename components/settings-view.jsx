"use client"

import { useEffect, useState } from "react"
import {
  CalendarCog,
  Clock,
  Cog,
  Download,
  FileSpreadsheet,
  KeyRound,
  Minus,
  Plus,
  RotateCcw,
  LogOut,
  Save,
  Trash2,
  Upload,
  UserCog,
} from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import {
  adjustRecord,
  deleteJustification,
  getJustifications,
  getRecord,
  getRecords,
  importRecords,
  saveJustification,
  updateUser,
} from "@/lib/store"
import { currentTimeWithSeconds, friendlyDate, parseISODate, todayISO, toISODate } from "@/lib/time-utils"
import { DEFAULT_PUNCH_FIELDS, JUSTIFICATION_LABELS, PUNCH_FIELD_OPTIONS } from "@/lib/types"
import { calculateAge, isAdult } from "@/lib/profile-utils"
import { normalizeEmail, validateEmail, validateStrongPassword } from "@/lib/security-utils"
import { recordsToRows, rowsToRecords } from "@/lib/xlsx-utils"
import { cn } from "@/lib/utils"
import { AvatarPicker, UserAvatar } from "@/components/avatar-picker"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PasswordField } from "@/components/password-field"
import { toast } from "sonner"

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

function scheduleToHours(schedule) {
  return Array.from({ length: 7 }, (_, index) => {
    const minutes = Number(schedule?.[index] ?? 0)
    return minutes > 0 ? String(minutes / 60).replace(".", ",") : "0"
  })
}

function hoursToMinutes(value) {
  const hours = Number(String(value).replace(",", "."))
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return null
  return Math.round(hours * 60)
}

export function SettingsView({ onImportComplete }) {
  const { user } = useAuth()
  if (!user) return null

  return (
    <Tabs defaultValue="perfil" className="flex flex-col gap-4">
      <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl p-1">
        <TabsTrigger value="perfil" className="min-h-10 px-1 py-2 text-xs sm:text-sm">Perfil</TabsTrigger>
        <TabsTrigger value="justificar" className="min-h-10 px-1 py-2 text-xs sm:text-sm">Justificar</TabsTrigger>
        <TabsTrigger value="ajustar" className="min-h-10 px-1 py-2 text-xs sm:text-sm">Ajustar</TabsTrigger>
        <TabsTrigger value="planilha" className="min-h-10 px-1 py-2 text-xs sm:text-sm">Planilha</TabsTrigger>
      </TabsList>

      <TabsContent value="perfil" className="animate-fade-slide">
        <ProfileSection />
      </TabsContent>
      <TabsContent value="justificar" className="animate-fade-slide">
        <JustifySection />
      </TabsContent>
      <TabsContent value="ajustar" className="animate-fade-slide">
        <AdjustSection />
      </TabsContent>
      <TabsContent value="planilha" className="animate-fade-slide">
        <SpreadsheetSection onImportComplete={onImportComplete} />
      </TabsContent>
    </Tabs>
  )
}

function ProfileSection() {
  const { user, logout } = useAuth()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [birthDate, setBirthDate] = useState(user.birthDate ?? "")
  const [companyName, setCompanyName] = useState(user.companyName ?? "")
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "")
  const [avatarIcon, setAvatarIcon] = useState(user.avatarIcon ?? "user")
  const [clockOffsetSeconds, setClockOffsetSeconds] = useState(
    String(user.clockOffsetSeconds ?? (user.clockOffsetMinutes ?? 0) * 60),
  )
  const [clockPreview, setClockPreview] = useState(
    currentTimeWithSeconds(user.clockOffsetSeconds ?? (user.clockOffsetMinutes ?? 0) * 60),
  )
  const [scheduleHours, setScheduleHours] = useState(() => scheduleToHours(user.schedule))
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [activeDialog, setActiveDialog] = useState(null)
  const age = calculateAge(birthDate)

  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
    setBirthDate(user.birthDate ?? "")
    setCompanyName(user.companyName ?? "")
    setJobTitle(user.jobTitle ?? "")
    setAvatarIcon(user.avatarIcon ?? "user")
    setClockOffsetSeconds(String(user.clockOffsetSeconds ?? (user.clockOffsetMinutes ?? 0) * 60))
    setScheduleHours(scheduleToHours(user.schedule))
    setPassword("")
    setConfirm("")
  }, [
    user.avatarIcon,
    user.birthDate,
    user.clockOffsetMinutes,
    user.clockOffsetSeconds,
    user.companyName,
    user.email,
    user.jobTitle,
    user.name,
    user.schedule,
  ])

  useEffect(() => {
    const offset = Number(clockOffsetSeconds)
    const id = setInterval(() => {
      setClockPreview(currentTimeWithSeconds(Number.isFinite(offset) ? offset : 0))
    }, 1_000)
    setClockPreview(currentTimeWithSeconds(Number.isFinite(offset) ? offset : 0))
    return () => clearInterval(id)
  }, [clockOffsetSeconds])

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Informe seu nome.")
      return false
    }
    if (!isAdult(birthDate)) {
      toast.error("Você precisa ter 18 anos ou mais para usar o sistema.")
      return false
    }
    const res = await updateUser(user.id, {
      name: name.trim(),
      birthDate,
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      avatarIcon,
    })
    if (res?.error) {
      toast.error(res.error)
      return false
    }
    toast.success("Perfil atualizado.")
    return true
  }

  async function saveLogin() {
    if (password && password !== confirm) {
      toast.error("As senhas não coincidem.")
      return false
    }
    const emailError = validateEmail(email)
    if (emailError) {
      toast.error(emailError)
      return false
    }
    if (password) {
      const passwordError = validateStrongPassword(password)
      if (passwordError) {
        toast.error(passwordError)
        return false
      }
    }
    const res = await updateUser(user.id, {
      email: normalizeEmail(email),
      ...(password ? { password } : {}),
    })
    if (res?.error) {
      toast.error(res.error)
      return false
    }
    setPassword("")
    setConfirm("")
    toast.success("Login atualizado.")
    return true
  }

  async function saveClock() {
    const offset = Number(clockOffsetSeconds)
    if (!Number.isFinite(offset) || offset < -43200 || offset > 43200) {
      toast.error("Informe um ajuste de relógio entre -12h e 12h.")
      return false
    }
    const res = await updateUser(user.id, { clockOffsetSeconds: offset })
    if (res?.error) {
      toast.error(res.error)
      return false
    }
    toast.success("Relógio da empresa atualizado.")
    return true
  }

  async function saveSchedule() {
    const schedule = scheduleHours.map(hoursToMinutes)
    if (schedule.some((minutes) => minutes == null)) {
      toast.error("Informe horas de trabalho entre 0 e 24 para cada dia.")
      return false
    }

    const punchFields = schedule.map((minutes, index) => {
      if (minutes === 0) return []
      const current = Array.isArray(user.punchFields?.[index]) ? user.punchFields[index] : []
      return current.length > 0 ? current : DEFAULT_PUNCH_FIELDS[index]
    })

    const res = await updateUser(user.id, { schedule, punchFields })
    if (res?.error) {
      toast.error(res.error)
      return false
    }

    toast.success("Jornada atualizada.")
    return true
  }

  return (
    <Card className="ring-primary/20">
      <CardHeader>
        <CardTitle className="text-base">Meus dados</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <UserAvatar avatarIcon={avatarIcon} name={name} className="h-12 w-12" iconClassName="h-6 w-6" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[jobTitle, companyName].filter(Boolean).join(" • ") || "Complete seu perfil"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <SettingsOption
            icon={UserCog}
            title="Perfil"
            description={[name, jobTitle, companyName].filter(Boolean).join(" • ") || "Nome, nascimento, função e avatar"}
            onOpen={() => setActiveDialog("profile")}
          />
          <SettingsOption
            icon={KeyRound}
            title="Login"
            description={email}
            onOpen={() => setActiveDialog("login")}
          />
          <SettingsOption
            icon={CalendarCog}
            title="Minha jornada"
            description={`${scheduleHours.filter((value) => hoursToMinutes(value) > 0).length} dia(s) com trabalho configurado`}
            onOpen={() => setActiveDialog("schedule")}
          />
          <SettingsOption
            icon={Clock}
            title="Relógio da empresa"
            description={`Horário ajustado: ${clockPreview}`}
            onOpen={() => setActiveDialog("clock")}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={logout} className="h-10 text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </CardContent>

      <Dialog open={activeDialog === "profile"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar perfil</DialogTitle>
            <DialogDescription>Atualize nome, nascimento, empresa, função e avatar.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <UserAvatar avatarIcon={avatarIcon} name={name} className="h-12 w-12" iconClassName="h-6 w-6" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[jobTitle, companyName].filter(Boolean).join(" • ") || "Complete seu perfil"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_5rem]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-birth-date">Data de nascimento</Label>
                <Input
                  id="profile-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Idade</Label>
                <div className="flex h-8 items-center justify-center rounded-md border border-input bg-muted/40 text-sm font-semibold">
                  {age ?? "--"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-company">Nome da empresa</Label>
                <Input id="profile-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-job">Função na empresa</Label>
                <Input id="profile-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Avatar do perfil</Label>
              <AvatarPicker value={avatarIcon} onChange={setAvatarIcon} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button type="button" onClick={async () => (await saveProfile()) && setActiveDialog(null)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar perfil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "login"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar login</DialogTitle>
            <DialogDescription>Atualize seu e-mail de acesso e senha.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="profile-email">E-mail</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pwd">Nova senha</Label>
                <PasswordField id="pwd" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pwd2">Confirmar</Label>
                <PasswordField id="pwd2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button type="button" onClick={async () => (await saveLogin()) && setActiveDialog(null)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "schedule"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar minha jornada</DialogTitle>
            <DialogDescription>Defina os dias que trabalha e a carga diária.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScheduleHours(scheduleToHours([0, 480, 480, 480, 480, 480, 0]))}
              >
                Padrão
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
              {DAY_LABELS.map((day, index) => {
                const enabled = hoursToMinutes(scheduleHours[index]) > 0
                return (
                  <div
                    key={day}
                    className={cn(
                      "rounded-lg border p-2 transition-colors",
                      enabled ? "border-primary/30 bg-background" : "border-primary/10 bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleHours((current) =>
                          current.map((value, itemIndex) => {
                            if (itemIndex !== index) return value
                            return hoursToMinutes(value) > 0 ? "0" : "8"
                          }),
                        )
                      }
                      className={cn(
                        "mb-2 h-7 w-full rounded-md text-xs font-semibold transition-colors",
                        enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {day}
                    </button>
                    <Input
                      aria-label={`Horas de ${day}`}
                      inputMode="decimal"
                      className="h-8 px-1 text-center text-sm"
                      value={scheduleHours[index]}
                      onChange={(event) =>
                        setScheduleHours((current) =>
                          current.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)),
                        )
                      }
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">Use 0 nos dias sem trabalho. Ex.: 8, 7,5 ou 4.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button type="button" onClick={async () => (await saveSchedule()) && setActiveDialog(null)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar jornada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "clock"} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar relógio da empresa</DialogTitle>
            <DialogDescription>Defina o horário local usado no registro do ponto.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-primary/30 bg-background px-4 py-4 text-center shadow-sm">
              <p className="font-mono text-4xl font-bold leading-none tabular-nums text-primary">{clockPreview}</p>
              <p className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">Horário ajustado</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ClockAdjust label="Minuto" step={60} value={clockOffsetSeconds} onChange={setClockOffsetSeconds} />
              <ClockAdjust label="Segundo" step={1} value={clockOffsetSeconds} onChange={setClockOffsetSeconds} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setClockOffsetSeconds("0")}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Usar horário local
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button type="button" onClick={async () => (await saveClock()) && setActiveDialog(null)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar relógio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function SettingsOption({ icon: Icon, title, description, onOpen }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={onOpen} aria-label={`Abrir ${title}`}>
          <Cog className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

function ClockAdjust({ label, step, value, onChange }) {
  function adjust(delta) {
    onChange((current) => String(Math.max(-43200, Math.min(43200, Number(current || 0) + delta))))
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-background p-2">
      <p className="mb-2 text-center text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => adjust(-step)} aria-label={`Atrasar ${label.toLowerCase()}`}>
          <Minus className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => adjust(step)} aria-label={`Adiantar ${label.toLowerCase()}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function JustifySection() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [type, setType] = useState("justificada")
  const [reason, setReason] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const justifications = useStoreData(() =>
    getJustifications()
      .filter((j) => j.userId === user.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  )

  async function save() {
    if (!date) {
      toast.error("Selecione a data.")
      return
    }
    if (type === "abono" && (!startTime || !endTime || endTime <= startTime)) {
      toast.error("Informe o horário inicial e final do abono.")
      return
    }

    const dates = []
    if (type === "ferias") {
      if (!endDate || endDate < date) {
        toast.error("Informe um período de férias válido.")
        return
      }
      const cursor = parseISODate(date)
      const end = parseISODate(endDate)
      while (cursor <= end) {
        dates.push(toISODate(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      dates.push(date)
    }

    for (const itemDate of dates) {
      const res = await saveJustification(user.id, itemDate, type, reason.trim(), {
        startTime: type === "abono" ? startTime : "",
        endTime: type === "abono" ? endTime : "",
      })
      if (res?.error) {
        toast.error(res.error)
        return
      }
    }
    setReason("")
    toast.success(type === "ferias" ? `${dates.length} dia(s) de férias registrado(s).` : "Justificativa registrada.")
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Justificar falta ou ausência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="just-date">{type === "ferias" ? "Início" : "Data"}</Label>
                <Input id="just-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              </div>
              {type === "ferias" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="just-end-date">Fim</Label>
                  <Input id="just-end-date" type="date" value={endDate} max={todayISO()} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value)
                if (value !== "abono") {
                  setStartTime("")
                  setEndTime("")
                }
                if (value === "ferias") setEndDate(date)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(JUSTIFICATION_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "abono" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="abono-start">Horário inicial</Label>
                  <Input id="abono-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="abono-end">Horário final</Label>
                  <Input id="abono-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Esse intervalo é abonado no banco de horas e reduz a jornada cobrada no dia.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Descreva o motivo da ausência..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <Button onClick={save}>
            <Save className="mr-2 h-4 w-4" />
            Registrar justificativa
          </Button>
        </CardContent>
      </Card>

      {justifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Justificativas registradas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 px-4 py-4 sm:px-5">
            {justifications.map((j) => (
              <div key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-primary/80">Informação registrada</p>
                  <p className="text-sm font-medium capitalize text-foreground">{friendlyDate(j.date)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {JUSTIFICATION_LABELS[j.type]}
                    {j.startTime && j.endTime ? ` (${j.startTime} - ${j.endTime})` : ""}
                    {j.reason ? ` - ${j.reason}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={async () => {
                    const res = await deleteJustification(user.id, j.date)
                    if (res?.error) {
                      toast.error(res.error)
                      return
                    }
                    toast.success("Justificativa removida.")
                  }}
                  aria-label="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AdjustSection() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())

  const record = useStoreData(() => (date ? getRecord(user.id, date) : undefined))

  const [values, setValues] = useState({ entry: "", breakTime: "", returnTime: "", exit: "" })
  const [loadedDate, setLoadedDate] = useState("")

  useEffect(() => {
    if (loadedDate === date) return

    setLoadedDate(date)
    setValues({
      entry: record?.entry ?? "",
      breakTime: record?.breakTime ?? "",
      returnTime: record?.returnTime ?? "",
      exit: record?.exit ?? "",
    })
  }, [date, loadedDate, record])

  const dayIndex = date ? parseISODate(date).getDay() : -1
  const configuredKeys = Array.isArray(user.punchFields?.[dayIndex])
    ? user.punchFields[dayIndex]
    : PUNCH_FIELD_OPTIONS.map((field) => field.key)
  const fields = PUNCH_FIELD_OPTIONS.filter((field) => configuredKeys.includes(field.key))

  async function save() {
    if (!date) {
      toast.error("Selecione a data do ajuste.")
      return
    }

    const payload = fields.reduce((acc, field) => {
      acc[field.key] = values[field.key]
      return acc
    }, {})

    const entry = payload.entry
    const breakTime = payload.breakTime
    const returnTime = payload.returnTime
    const exit = payload.exit

    if (returnTime && !breakTime) {
      toast.error("Informe a pausa antes do retorno.")
      return
    }
    if (breakTime && returnTime && returnTime <= breakTime) {
      toast.error("O retorno deve ser depois da pausa.")
      return
    }
    if (entry && exit && exit <= entry) {
      toast.error("A saída deve ser depois da entrada.")
      return
    }

    const res = await adjustRecord(user.id, date, payload)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success("Ponto ajustado.")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajustar ponto de um dia</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="adj-date">Data</Label>
          <Input id="adj-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map(({ key, label }) => (
            <div key={key} className="flex flex-col gap-2">
              <Label htmlFor={`adj-${key}`}>{label}</Label>
              <Input
                id={`adj-${key}`}
                type="time"
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {fields.length === 0 ? "Nenhuma batida configurada para este dia." : "Deixe um campo vazio para apaga-lo."}
        </p>
        <Button onClick={save} disabled={fields.length === 0}>
          <Save className="mr-2 h-4 w-4" />
          Salvar ajuste
        </Button>
      </CardContent>
    </Card>
  )
}

function SpreadsheetSection({ onImportComplete }) {
  const { user } = useAuth()
  const [importing, setImporting] = useState(false)
  const [importYear, setImportYear] = useState(String(new Date().getFullYear()))
  const records = useStoreData(() =>
    getRecords()
      .filter((record) => record.userId === user.id)
      .sort((a, b) => a.date.localeCompare(b.date)),
  )

  async function loadXlsx() {
    return import("xlsx")
  }

  async function downloadWorkbook(rows, filename) {
    const XLSX = await loadXlsx()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ponto")
    XLSX.writeFile(workbook, filename)
  }

  async function exportRecords() {
    if (records.length === 0) {
      toast.info("Nenhum ponto encontrado para exportar.")
      return
    }

    await downloadWorkbook(recordsToRows(records), `meu-ponto-${user.name || "usuario"}.xlsx`)
  }

  async function downloadTemplate() {
    await downloadWorkbook(
      [
        {
          Data: todayISO(),
          Entrada: "08:00",
          Pausa: "12:00",
          Retorno: "13:00",
          Saída: "17:00",
        },
      ],
      "modelo-importacao-ponto.xlsx",
    )
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setImporting(true)
    try {
      const year = Number(importYear)
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        toast.error("Informe um ano válido para a importação.")
        return
      }

      const XLSX = await loadXlsx()
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { cellDates: true })
      const importedRecords = []
      const errors = []

      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "dd/mm/yyyy" })
        const result = rowsToRecords(rows, {
          defaultYear: year,
        })

        importedRecords.push(...result.records)
        errors.push(...result.errors.map((error) => `${sheetName}: ${error}`))
      })

      if (errors.length > 0) {
        toast.error(errors.slice(0, 3).join(" "))
        return
      }

      const res = await importRecords(user.id, importedRecords)
      if (res?.error) {
        toast.error(res.error)
        return
      }

      toast.success(`${res.count} registro(s) importado(s).`)
      onImportComplete?.(res)
    } catch {
      toast.error("Não foi possível ler a planilha.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            Importar e exportar ponto
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
            A importação lê todas as abas do XLSX, usando apenas Data, Entrada, Pausa, Retorno e Saída.
            Colunas como Hrs Trabalho, Banco, Total e demais cálculos são ignoradas.
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="import-year">Ano da importação</Label>
            <Input
              id="import-year"
              type="number"
              min="1900"
              max="2100"
              value={importYear}
              onChange={(event) => setImportYear(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usado quando a coluna Data vem sem ano, por exemplo 01/jan ou 01/06.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={downloadTemplate} className="h-10">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Modelo
            </Button>
            <Button variant="outline" onClick={exportRecords} className="h-10">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <label className={cn(buttonVariants(), "h-10 cursor-pointer", importing && "pointer-events-none opacity-50")}>
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar"}
              <input type="file" accept=".xlsx,.xls" className="sr-only" disabled={importing} onChange={handleFile} />
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Ao importar, dias já existentes serão atualizados no banco. Campos vazios apagam o horário daquele campo.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Registros carregados</p>
            <p className="text-xs text-muted-foreground">Total disponível para exportação</p>
          </div>
          <span className="font-mono text-lg font-bold text-primary tabular-nums">{records.length}</span>
        </CardContent>
      </Card>
    </div>
  )
}
