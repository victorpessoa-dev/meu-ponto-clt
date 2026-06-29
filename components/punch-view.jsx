"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, DoorOpen, LogIn, LogOut, Coffee, Utensils, Check } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import { getJustification, getMonthRecords, getRecord, punch } from "@/lib/store"
import {
  currentTime,
  expectedMinutes,
  friendlyDate,
  minutesToHHMM,
  monthName,
  toISODate,
  todayISO,
  parseISODate,
  workedMinutes,
} from "@/lib/time-utils"
import { JUSTIFICATION_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

const FIELDS = [
  { key: "entry", label: "Entrada", icon: LogIn, tone: "entry" },
  { key: "breakTime", label: "Pausa", icon: Coffee, tone: "neutral" },
  { key: "returnTime", label: "Retorno", icon: Utensils, tone: "neutral" },
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
  const [now, setNow] = useState(currentTime())
  const today = todayISO()
  const isToday = date === today
  const dayIndex = parseISODate(date).getDay()

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(currentTime()), 30_000)
    return () => clearInterval(id)
  }, [isToday])

  const record = useStoreData(() => (user ? getRecord(user.id, date) : undefined))
  const justification = useStoreData(() => (user ? getJustification(user.id, date) : undefined))
  const monthRecords = useStoreData(() =>
    user ? getMonthRecords(user.id, parseISODate(date).getFullYear(), parseISODate(date).getMonth()) : [],
  )

  const schedule = user?.schedule ?? []
  const worked = workedMinutes(record)
  const expected = expectedMinutes(date, schedule)
  const balance = worked - expected
  const hasAnyPunch = !!(record?.entry || record?.breakTime || record?.returnTime || record?.exit)
  const isClosed = !!(record?.entry && record?.exit)
  const configuredKeys = Array.isArray(user?.punchFields?.[dayIndex]) ? user.punchFields[dayIndex] : FULL_DAY_KEYS
  const activeFields = FIELDS.filter((f) => configuredKeys.includes(f.key))
  const monthChart = useMemo(() => buildMonthChart(date, monthRecords, schedule), [date, monthRecords, schedule])

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
          {isToday && (
            <span className="font-mono text-lg font-bold tabular-nums text-primary sm:text-xl">{now}</span>
          )}
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

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-3 divide-x divide-border">
          <DaySummary label="Trabalhado" value={isClosed ? minutesToHHMM(worked) : "--:--"} />
          <DaySummary label="Jornada" value={expected > 0 ? minutesToHHMM(expected) : "Folga"} />
          <DaySummary
            label="Saldo"
            value={isClosed ? minutesToHHMM(balance) : "--:--"}
            tone={!isClosed ? "muted" : balance >= 0 ? "positive" : "negative"}
          />
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
          const canPunch = isToday && !value && !disabledByClosedDay
          return (
            <button
              key={key}
              onClick={() => handlePunch(key)}
              disabled={disabledByClosedDay || (!isToday && !value)}
              className={cn(
                "relative flex min-h-[7rem] flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] sm:min-h-[7.5rem] sm:gap-3 sm:p-4",
                value
                  ? "border-border bg-card"
                  : canPunch
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-dashed border-border bg-muted/40",
                !value && !isToday && "opacity-60",
                disabledByClosedDay && "cursor-not-allowed opacity-55",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    value && tone === "entry" && "bg-positive/15 text-positive",
                    value && tone === "exit" && "bg-negative/15 text-negative",
                    value && tone === "neutral" && "bg-secondary text-secondary-foreground",
                    !value && canPunch && "bg-primary-foreground/15 text-primary-foreground",
                    !value && !canPunch && "bg-muted text-muted-foreground",
                  )}
                >
                  {value ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </span>
                {value && <span className="text-xs font-medium text-muted-foreground">registrado</span>}
                {!value && canPunch && <span className="text-xs font-medium opacity-90">tocar p/ registrar</span>}
                {!value && disabledByClosedDay && <span className="text-xs font-medium text-muted-foreground">desativado</span>}
              </div>
              <div>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    canPunch && !value ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                <p
                  className={cn(
                    "font-mono text-xl font-bold tabular-nums sm:text-2xl",
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

function buildMonthChart(date, records, schedule) {
  const base = parseISODate(date)
  const year = base.getFullYear()
  const month = base.getMonth()
  const today = todayISO()
  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const iso = toISODate(new Date(year, month, index + 1))
    const record = recordsByDate.get(iso)
    const worked = workedMinutes(record)
    const expected = expectedMinutes(iso, schedule)
    const closed = !!(record?.entry && record?.exit)
    return {
      iso,
      day: String(index + 1).padStart(2, "0"),
      worked,
      expected,
      closed,
      future: iso > today,
      balance: closed ? worked - expected : null,
    }
  })

  const closedDays = days.filter((day) => day.closed)
  const totalWorked = closedDays.reduce((total, day) => total + day.worked, 0)
  const totalBalance = closedDays.reduce((total, day) => total + day.worked - day.expected, 0)
  const maxMinutes = Math.max(60, ...days.map((day) => Math.max(day.worked, day.expected)))

  return {
    label: `${monthName(month)} de ${year}`,
    days,
    totalWorked,
    totalBalance,
    closedCount: closedDays.length,
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
          const expectedHeight = `${Math.max(5, (day.expected / chart.maxMinutes) * 100)}%`
          const workedHeight = `${Math.max(5, (day.worked / chart.maxMinutes) * 100)}%`
          return (
            <div key={day.iso} className="flex min-w-5 flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end justify-center gap-0.5">
                <span
                  className={cn("w-1.5 rounded-t bg-primary/20", day.future && "opacity-30")}
                  style={{ height: expectedHeight }}
                  title={`Jornada ${minutesToHHMM(day.expected)}`}
                />
                <span
                  className={cn(
                    "w-1.5 rounded-t transition-all duration-500",
                    !day.closed ? "bg-muted" : day.balance >= 0 ? "bg-positive" : "bg-negative",
                    day.future && "opacity-30",
                  )}
                  style={{ height: workedHeight }}
                  title={day.closed ? `Trabalhado ${minutesToHHMM(day.worked)}` : "Sem fechamento"}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{day.day}</span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary/25" />
          Jornada
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-positive" />
          Fechado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted" />
          Aberto
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

function DaySummary({ label, value, tone = "default" }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 py-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "muted" && "text-muted-foreground/50",
        )}
      >
        {value}
      </span>
    </div>
  )
}
