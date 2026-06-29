"use client"

import { useEffect, useState } from "react"
import { Download, FileSpreadsheet, LogOut, Save, Trash2, Upload } from "lucide-react"
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
import { friendlyDate, parseISODate, todayISO } from "@/lib/time-utils"
import { JUSTIFICATION_LABELS, PUNCH_FIELD_OPTIONS } from "@/lib/types"
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
import { PasswordField } from "@/components/password-field"
import { toast } from "sonner"

export function SettingsView({ onImportComplete }) {
  const { user } = useAuth()
  if (!user) return null

  return (
    <Tabs defaultValue="perfil" className="flex flex-col gap-4">
      <TabsList className="grid h-auto w-full grid-cols-4 gap-0.5 p-1">
        <TabsTrigger value="perfil" className="px-1 py-2 text-xs sm:text-sm">Perfil</TabsTrigger>
        <TabsTrigger value="justificar" className="px-1 py-2 text-xs sm:text-sm">Justificar</TabsTrigger>
        <TabsTrigger value="ajustar" className="px-1 py-2 text-xs sm:text-sm">Ajustar</TabsTrigger>
        <TabsTrigger value="planilha" className="px-1 py-2 text-xs sm:text-sm">Planilha</TabsTrigger>
      </TabsList>

      <TabsContent value="perfil">
        <ProfileSection />
      </TabsContent>
      <TabsContent value="justificar">
        <JustifySection />
      </TabsContent>
      <TabsContent value="ajustar">
        <AdjustSection />
      </TabsContent>
      <TabsContent value="planilha">
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
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const age = calculateAge(birthDate)

  useEffect(() => {
    setName(user.name)
    setEmail(user.email)
    setBirthDate(user.birthDate ?? "")
    setCompanyName(user.companyName ?? "")
    setJobTitle(user.jobTitle ?? "")
    setAvatarIcon(user.avatarIcon ?? "user")
    setPassword("")
    setConfirm("")
  }, [user.avatarIcon, user.birthDate, user.companyName, user.email, user.jobTitle, user.name])

  async function save() {
    if (!name.trim()) {
      toast.error("Informe seu nome.")
      return
    }
    if (password && password !== confirm) {
      toast.error("As senhas não coincidem.")
      return
    }
    const emailError = validateEmail(email)
    if (emailError) {
      toast.error(emailError)
      return
    }
    if (password) {
      const passwordError = validateStrongPassword(password)
      if (passwordError) {
        toast.error(passwordError)
        return
      }
    }
    if (!isAdult(birthDate)) {
      toast.error("Você precisa ter 18 anos ou mais para usar o sistema.")
      return
    }
    const res = await updateUser(user.id, {
      name: name.trim(),
      email: normalizeEmail(email),
      birthDate,
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      avatarIcon,
      ...(password ? { password } : {}),
    })
    if (res?.error) {
      toast.error(res.error)
      return
    }
    setPassword("")
    setConfirm("")
    toast.success("Perfil atualizado.")
  }

  const scheduleLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meus dados</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
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

        <div className="flex flex-col gap-2">
          <Label>Jornada semanal</Label>
          <div className="flex flex-wrap gap-1.5">
            {user.schedule.map((min, i) => (
              <span
                key={i}
                className="flex flex-col items-center rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px]"
              >
                <span className="font-medium text-foreground">{scheduleLabels[i]}</span>
                <span className="text-muted-foreground">{min === 0 ? "-" : `${Math.floor(min / 60)}h`}</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">A jornada é definida pelo administrador.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Batidas configuradas</Label>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {scheduleLabels.map((day, i) => {
              const fields = PUNCH_FIELD_OPTIONS.filter((field) => user.punchFields?.[i]?.includes(field.key))
              return (
                <div key={day} className="rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px]">
                  <span className="font-medium text-foreground">{day}</span>
                  <span className="ml-2 text-muted-foreground">
                    {fields.length > 0 ? fields.map((field) => field.label).join(", ") : "Folga"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={save} className="h-10">
            <Save className="mr-2 h-4 w-4" />
            Salvar perfil
          </Button>
          <Button variant="outline" onClick={logout} className="h-10 text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function JustifySection() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [type, setType] = useState("falta")
  const [reason, setReason] = useState("")

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
    const res = await saveJustification(user.id, date, type, reason.trim())
    if (res?.error) {
      toast.error(res.error)
      return
    }
    setReason("")
    toast.success("Justificativa registrada.")
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Justificar falta ou ausência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="just-date">Data</Label>
            <Input id="just-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
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
              <div key={j.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize text-foreground">{friendlyDate(j.date)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {JUSTIFICATION_LABELS[j.type]}
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
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
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
