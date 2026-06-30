"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, DoorOpen, LogIn, LogOut, Coffee, Utensils, Check } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import { getJustification, getMonthJustifications, getMonthRecords, getRecord, punch } from "@/lib/store"
import {
  activeWorkedMinutes,
  bankMetrics,
  currentTimeWithSeconds,
  friendlyDate,
  minutesToHHMM,
  monthName,
  toISODate,
  todayISO,
  parseISODate,
} from "@/lib/time-utils"
import { JUSTIFICATION_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

const FIELDS = [
  { key: "entry", label: "Entrada", icon: LogIn, tone: "entry" },
  { key: "breakTime", label: "Pausa", icon: Coffee, tone: "break" },
  { key: "returnTime", label: "Retorno", icon: Utensils, tone: "return" },
  { key: "exit", label: "Saída", icon: LogOut, tone: "exit" },
]

const PUNCH_LABELS = {
  entry: "Entrada",
  breakTime: "Pausa",
  returnTime: "Retorno",
  exit: "Saída",
}

const FULL_DAY_KEYS = FIELDS.map((field) => field.key)

export function PunchView() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [now, setNow] = useState(currentTimeWithSeconds(user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60))
  const today = todayISO()
  const isToday = date === today
  const dayIndex = parseISODate(date).getDay()

  useEffect(() => {
    if (!isToday) return
    const offset = user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60
    setNow(currentTimeWithSeconds(offset))
    const id = setInterval(() => setNow(currentTimeWithSeconds(offset)), 1_000)
    return () => clearInterval(id)
  }, [isToday, user?.clockOffsetMinutes, user?.clockOffsetSeconds])

  const record = useStoreData(() => (user ? getRecord(user.id, date) : undefined))
  const justification = useStoreData(() => (user ? getJustification(user.id, date) : undefined))
  const monthRecords = useStoreData(() =>
    user ? getMonthRecords(user.id, parseISODate(date).getFullYear(), parseISODate(date).getMonth()) : [],
  )
  const monthJustifications = useStoreData(() =>
    user ? getMonthJustifications(user.id, parseISODate(date).getFullYear(), parseISODate(date).getMonth()) : [],
  )

  const schedule = user?.schedule ?? []
  const metrics = bankMetrics(date, record, schedule, justification)
  const { worked, expected, balance } = metrics
  const activeWorked = activeWorkedMinutes(record, now)
  const hasEntry = !!record?.entry
  const hasAnyPunch = !!(record?.entry || record?.breakTime || record?.returnTime || record?.exit)
  const isClosed = metrics.closed
  const configuredKeys = Array.isArray(user?.punchFields?.[dayIndex]) ? user.punchFields[dayIndex] : FULL_DAY_KEYS
  const activeFields = FIELDS.filter((f) => configuredKeys.includes(f.key))
  const monthChart = useMemo(
    () => buildMonthChart(date, monthRecords, monthJustifications, schedule),
    [date, monthJustifications, monthRecords, schedule],
  )

  if (!user) return null

  function shiftDay(delta) {
    const d = parseISODate(date)
    d.setDate(d.getDate() + delta)
    const iso = toISODate(d)
    if (iso > today) return
    setDate(iso)
  }

  async function handlePunch(field) {
    if (!isToday) {
      toast.info("Só é possível bater ponto no dia de hoje. Para corrigir outro dia, use Ajustes.")
      return
    }
    if (record?.[field]) return
    if (isClosed && ["breakTime", "returnTime"].includes(field)) return
    if (field === "returnTime" && !record?.breakTime) {
      toast.info("Registre a pausa antes do retorno.")
      return
    }
    if (!activeFields.some((item) => item.key === field)) return
    const res = await punch(user.id, field)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(`${PUNCH_LABELS[field]} registrada.`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" className="touch-target shrink-0" onClick={() => shiftDay(-1)} aria-label="Dia anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <span className="truncate text-sm font-semibold capitalize text-foreground sm:text-base">{friendlyDate(date)}</span>
          {!isToday && (
            <button onClick={() => setDate(today)} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
              Voltar para hoje
            </button>
          )}
          {isToday && <span className="text-xs text-muted-foreground">Hoje</span>}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="touch-target shrink-0"
          onClick={() => shiftDay(1)}
          disabled={date >= today}
          aria-label="Próximo dia"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isToday && (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase text-primary/80">Relógio da empresa</p>
          <p className="font-mono text-3xl font-bold tabular-nums text-primary">{now}</p>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-3 divide-x divide-border">
          <DaySummary label={isClosed ? "Trabalhado" : "Trabalhando"} value={hasEntry ? minutesToHHMM(activeWorked) : "--:--"} tone={!isClosed && hasEntry ? "active" : "default"} />
          <DaySummary label="Jornada" value={expected > 0 ? minutesToHHMM(expected) : "Folga"} />
          <DaySummary label="Saldo" value={metrics.bankable ? minutesToHHMM(balance) : "--:--"} tone={!metrics.bankable ? "muted" : balance >= 0 ? "positive" : "negative"} />
        </div>
      </Card>

      {justification && (
        <div className="rounded-lg border border-border bg-accent/40 px-4 py-3 text-sm">
          <span className="font-semibold text-accent-foreground">{JUSTIFICATION_LABELS[justification.type]}</span>
          {justification.reason && <span className="text-muted-foreground"> - {justification.reason}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {activeFields.map(({ key, label, icon: Icon, tone }) => {
          const value = record?.[key] ?? null
          const disabledByClosedDay = isClosed && ["breakTime", "returnTime"].includes(key) && !value
          const needsBreakFirst = key === "returnTime" && !record?.breakTime
          const canPunch = isToday && !value && !disabledByClosedDay
          return (
            <button
              key={key}
              onClick={() => handlePunch(key)}
              disabled={disabledByClosedDay || (!isToday && !value)}
              className={cn(
                "relative flex min-h-[7rem] flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] sm:min-h-[7.5rem] sm:gap-3 sm:p-4",
                punchCardClass({ tone, value, canPunch }),
                !value && !isToday && "opacity-60",
                disabledByClosedDay && "cursor-not-allowed opacity-55",
              )}
            >
              {!value && !canPunch && (
                <span className={cn("pointer-events-none absolute left-3 right-3 top-1/2 h-px", punchStrikeClass(tone))} />
              )}
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    punchIconClass({ tone, value, canPunch }),
                  )}
                >
                  {value ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </span>
                {value && <span className="text-xs font-medium opacity-90">registrado</span>}
                {!value && canPunch && !needsBreakFirst && <span className={cn("text-xs font-medium", punchTextClass(tone))}>tocar p/ registrar</span>}
                {!value && disabledByClosedDay && <span className="text-xs font-medium text-muted-foreground">desativado</span>}
                {!value && needsBreakFirst && !disabledByClosedDay && <span className="text-xs font-medium text-primary">pausa primeiro</span>}
              </div>
              <div>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    value ? "text-current/80" : canPunch ? punchTextClass(tone) : punchMutedTextClass(tone),
                  )}
                >
                  {label}
                </span>
                <p
                  className={cn(
                    "font-mono text-xl font-bold tabular-nums sm:text-2xl",
                    value ? "text-current" : canPunch && punchTextClass(tone),
                    !value && !canPunch && "text-muted-foreground/50",
                  )}
                >
                  {value ?? "--:--"}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {activeFields.length === 0 && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          Nenhuma batida configurada para este dia.
        </p>
      )}

      {!isClosed && hasAnyPunch && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          Horário em aberto: registre entrada e saída para fechar o dia.
        </p>
      )}

      {!hasAnyPunch && isToday && activeFields.length > 0 && (
        <p className="flex items-center justify-center gap-2 pt-1 text-center text-sm text-muted-foreground">
          <DoorOpen className="h-4 w-4" />
          Escolha qual batida deseja registrar.
        </p>
      )}

      <MonthOverview chart={monthChart} />
    </div>
  )
}

function buildMonthChart(date, records, justifications, schedule) {
  const base = parseISODate(date)
  const year = base.getFullYear()
  const month = base.getMonth()
  const today = todayISO()
  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  const justByDate = new Map(justifications.map((justification) => [justification.date, justification]))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const iso = toISODate(new Date(year, month, index + 1))
    const record = recordsByDate.get(iso)
    const metrics = bankMetrics(iso, record, schedule, justByDate.get(iso))
    return {
      iso,
      day: String(index + 1).padStart(2, "0"),
      worked: metrics.worked,
      closed: metrics.closed,
      bankable: metrics.bankable,
      future: iso > today,
      balance: metrics.balance,
    }
  })

  const bankableDays = days.filter((day) => day.bankable)
  const totalWorked = bankableDays.reduce((total, day) => total + day.worked, 0)
  const totalBalance = bankableDays.reduce((total, day) => total + day.balance, 0)
  const maxMinutes = Math.max(60, ...days.map((day) => day.worked))

  return {
    label: `${monthName(month)} de ${year}`,
    days,
    totalWorked,
    totalBalance,
    closedCount: bankableDays.length,
    maxMinutes,
  }
}

function MonthOverview({ chart }) {
  return (
    <Card className="overflow-hidden p-4 animate-fade-slide">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Resumo dos meus pontos</p>
            <p className="truncate text-xs text-muted-foreground">{chart.label}</p>
          </div>
        </div>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          {chart.closedCount} dia(s)
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <MiniMetric label="Trabalhado" value={minutesToHHMM(chart.totalWorked)} />
        <MiniMetric
          label="Banco"
          value={minutesToHHMM(chart.totalBalance)}
          tone={chart.totalBalance >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="flex h-32 items-end gap-1 overflow-x-auto pb-1">
        {chart.days.map((day) => {
          const workedHeight = `${Math.max(5, (day.worked / chart.maxMinutes) * 100)}%`
          return (
            <div key={day.iso} className="flex min-w-5 flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end justify-center">
                <span
                  className={cn(
                    "w-3 rounded-t transition-all duration-500",
                    !day.bankable ? "bg-muted" : day.balance >= 0 ? "bg-positive" : "bg-negative",
                    day.future && "opacity-30",
                  )}
                  style={{ height: workedHeight }}
                  title={day.bankable ? `Trabalhado ${minutesToHHMM(day.worked)}` : "Sem banco"}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{day.day}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-positive" />
          Positivo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-negative" />
          Negativo
        </span>
      </div>
    </Card>
  )
}

function MiniMetric({ label, value, tone = "default" }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <p
        className={cn(
          "font-mono text-base font-bold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function punchCardClass({ tone, value, canPunch }) {
  if (value) {
    if (tone === "entry") return "border-positive bg-positive text-positive-foreground shadow-md"
    if (tone === "exit") return "border-negative bg-negative text-negative-foreground shadow-md"
    if (tone === "break") return "border-chart-3 bg-chart-3 text-primary-foreground shadow-md"
    if (tone === "return") return "border-primary bg-primary text-primary-foreground shadow-md"
    return "border-primary bg-primary text-primary-foreground shadow-md"
  }

  const disabled = !canPunch
  if (disabled) {
    if (tone === "entry") return "border-positive/30 bg-positive/5 shadow-sm"
    if (tone === "exit") return "border-negative/30 bg-negative/5 shadow-sm"
    if (tone === "break") return "border-chart-3/30 bg-chart-3/5 shadow-sm"
    return "border-primary/30 bg-primary/5 shadow-sm"
  }

  if (tone === "entry") return "border-positive/70 bg-positive/10 shadow-sm"
  if (tone === "exit") return "border-negative/70 bg-negative/10 shadow-sm"
  if (tone === "break") return "border-chart-3/70 bg-chart-3/10 shadow-sm"
  if (tone === "return") return "border-primary/70 bg-primary/10 shadow-sm"
  return "border-primary/70 bg-primary/10 shadow-sm"
}

function punchIconClass({ tone, value, canPunch }) {
  if (value) {
    return "bg-white/20 text-current"
  }

  if (tone === "entry") return cn("bg-positive/15 text-positive", !canPunch && "bg-positive/5 text-positive/45")
  if (tone === "exit") return cn("bg-negative/15 text-negative", !canPunch && "bg-negative/5 text-negative/45")
  if (tone === "break") return cn("bg-chart-3/15 text-chart-3", !canPunch && "bg-chart-3/5 text-chart-3/45")
  if (tone === "return") return cn("bg-primary/15 text-primary", !canPunch && "bg-primary/5 text-primary/45")
  return cn("bg-primary/15 text-primary", !canPunch && "bg-primary/5 text-primary/45")
}

function punchTextClass(tone) {
  if (tone === "entry") return "text-positive"
  if (tone === "exit") return "text-negative"
  if (tone === "break") return "text-chart-3"
  if (tone === "return") return "text-primary"
  return "text-primary"
}

function punchMutedTextClass(tone) {
  if (tone === "entry") return "text-positive/45"
  if (tone === "exit") return "text-negative/45"
  if (tone === "break") return "text-chart-3/45"
  if (tone === "return") return "text-primary/45"
  return "text-primary/45"
}

function punchStrikeClass(tone) {
  if (tone === "entry") return "bg-positive/45"
  if (tone === "exit") return "bg-negative/45"
  if (tone === "break") return "bg-chart-3/45"
  if (tone === "return") return "bg-primary/45"
  return "bg-primary/45"
}

function DaySummary({ label, value, tone = "default" }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "active" && "text-primary",
          tone === "muted" && "text-muted-foreground/50",
        )}
      >
        {value}
      </span>
    </div>
  )
}
