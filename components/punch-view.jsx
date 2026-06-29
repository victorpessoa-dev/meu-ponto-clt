"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, DoorOpen, LogIn, LogOut, Coffee, Utensils, Check } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import { getJustification, getRecord, punch } from "@/lib/store"
import {
  currentTime,
  expectedMinutes,
  friendlyDate,
  minutesToHHMM,
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

export function PunchView() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [now, setNow] = useState(currentTime())
  const today = todayISO()
  const isToday = date === today
  const isSaturday = parseISODate(date).getDay() === 6

  useEffect(() => {
    if (!isToday) return
    const id = setInterval(() => setNow(currentTime()), 30_000)
    return () => clearInterval(id)
  }, [isToday])

  const record = useStoreData(() => (user ? getRecord(user.id, date) : undefined))
  const justification = useStoreData(() => (user ? getJustification(user.id, date) : undefined))

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
    if (isSaturday && ["breakTime", "returnTime"].includes(field)) {
      toast.info("Pausa e retorno ficam desativados aos sábados.")
      return
    }
    if (record?.[field]) return
    if (field !== nextField) {
      toast.info(`Registre primeiro: ${PUNCH_LABELS[nextField]}.`)
      return
    }
    const res = await punch(user.id, field)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(`${PUNCH_LABELS[field]} registrada.`)
  }

  const worked = workedMinutes(record)
  const expected = expectedMinutes(date, user.schedule)
  const balance = worked - expected
  const hasAnyPunch = !!(record?.entry || record?.breakTime || record?.returnTime || record?.exit)
  const activeFields = isSaturday ? FIELDS.filter((f) => !["breakTime", "returnTime"].includes(f.key)) : FIELDS
  const nextField = activeFields.find((f) => !record?.[f.key])?.key

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
          <DaySummary label="Trabalhado" value={hasAnyPunch ? minutesToHHMM(worked) : "--:--"} />
          <DaySummary label="Jornada" value={expected > 0 ? minutesToHHMM(expected) : "Folga"} />
          <DaySummary
            label="Saldo"
            value={hasAnyPunch ? minutesToHHMM(balance) : "--:--"}
            tone={!hasAnyPunch ? "muted" : balance >= 0 ? "positive" : "negative"}
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
        {FIELDS.map(({ key, label, icon: Icon, tone }) => {
          const value = record?.[key] ?? null
          const isNext = isToday && key === nextField
          const isSaturdayBreak = isSaturday && ["breakTime", "returnTime"].includes(key)
          return (
            <button
              key={key}
              onClick={() => handlePunch(key)}
              disabled={isSaturdayBreak || (!isToday && !value)}
              className={cn(
                "relative flex min-h-[7rem] flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all active:scale-[0.98] sm:min-h-[7.5rem] sm:gap-3 sm:p-4",
                value
                  ? "border-border bg-card"
                  : isNext
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-dashed border-border bg-muted/40",
                ((!value && !isToday) || isSaturdayBreak) && "opacity-60",
                !value && isToday && key !== nextField && !isSaturdayBreak && "cursor-not-allowed opacity-70",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    value && tone === "entry" && "bg-positive/15 text-positive",
                    value && tone === "exit" && "bg-negative/15 text-negative",
                    value && tone === "neutral" && "bg-secondary text-secondary-foreground",
                    !value && isNext && "bg-primary-foreground/15 text-primary-foreground",
                    !value && !isNext && "bg-muted text-muted-foreground",
                  )}
                >
                  {value ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </span>
                {value && <span className="text-xs font-medium text-muted-foreground">registrado</span>}
                {!value && isNext && <span className="text-xs font-medium opacity-90">tocar p/ registrar</span>}
                {!value && isSaturdayBreak && <span className="text-xs font-medium text-muted-foreground">sábado</span>}
              </div>
              <div>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    isNext && !value ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                <p
                  className={cn(
                    "font-mono text-xl font-bold tabular-nums sm:text-2xl",
                    !value && !isNext && "text-muted-foreground/50",
                  )}
                >
                  {value ?? "--:--"}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {!hasAnyPunch && isToday && (
        <p className="flex items-center justify-center gap-2 pt-1 text-center text-sm text-muted-foreground">
          <DoorOpen className="h-4 w-4" />
          Toque em Entrada para começar seu dia.
        </p>
      )}
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
