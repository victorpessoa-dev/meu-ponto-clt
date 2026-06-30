"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, EyeOff, Table2 } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import { getMonthJustifications, getMonthRecords } from "@/lib/store"
import {
  bankMetrics,
  minutesToHHMM,
  monthName,
  scheduleSummary,
  toISODate,
  weekdayShort,
} from "@/lib/time-utils"
import { JUSTIFICATION_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function ReportView({ cursorOverride, onCursorOverrideApplied }) {
  const { user } = useAuth()
  const now = new Date()
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showSheet, setShowSheet] = useState(true)

  useEffect(() => {
    if (!cursorOverride) return
    setCursor(cursorOverride)
    onCursorOverrideApplied?.()
  }, [cursorOverride, onCursorOverrideApplied])

  const records = useStoreData(() => (user ? getMonthRecords(user.id, cursor.year, cursor.month) : []))
  const justifications = useStoreData(() =>
    user ? getMonthJustifications(user.id, cursor.year, cursor.month) : [],
  )
  const schedule = user?.schedule ?? []

  const { dayMetrics, maxChartMinutes, totalWorked, totalBalance, workedDays } = useMemo(() => {
    const recordsByDate = new Map(records.map((record) => [record.date, record]))
    const justByDate = new Map(justifications.map((justification) => [justification.date, justification]))
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const metrics = Array.from({ length: daysInMonth }, (_, index) => {
      const iso = toISODate(new Date(cursor.year, cursor.month, index + 1))
      const rec = recordsByDate.get(iso)
      const just = justByDate.get(iso)
      return {
        iso,
        rec,
        just,
        ...bankMetrics(iso, rec, schedule, just),
        weekend: [0, 6].includes(new Date(iso + "T00:00:00").getDay()),
      }
    })

    return metrics.reduce(
      (acc, day) => {
        acc.maxChartMinutes = Math.max(acc.maxChartMinutes, day.worked)
        if (day.bankable) {
          acc.totalWorked += day.worked
          acc.totalBalance += day.balance
          acc.workedDays += 1
        }
        return acc
      },
      { dayMetrics: metrics, maxChartMinutes: 60, totalWorked: 0, totalBalance: 0, workedDays: 0 },
    )
  }, [cursor.month, cursor.year, justifications, records, schedule])

  if (!user) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-white p-3 shadow-sm">
        <CalendarCarousel
          ariaLabel="Selecionar mês do relatório"
          getValue={(offset) => (cursor.month + offset + 12) % 12}
          renderLabel={(month) => monthName(month)}
          onChange={(month) => setCursor((current) => ({ ...current, month }))}
          onShift={(delta) => setCursor((current) => ({ ...current, month: (current.month + delta + 12) % 12 }))}
          className="capitalize"
        />
        <CalendarCarousel
          ariaLabel="Selecionar ano do relatório"
          getValue={(offset) => cursor.year + offset}
          renderLabel={(year) => year}
          onChange={(year) => setCursor((current) => ({ ...current, year }))}
          onShift={(delta) => setCursor((current) => ({ ...current, year: current.year + delta }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <SummaryCard label="Trabalhado" value={minutesToHHMM(totalWorked)} />
        <SummaryCard label="Dias" value={String(workedDays)} />
        <SummaryCard
          label="Banco"
          value={minutesToHHMM(totalBalance)}
          tone={totalBalance >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="overflow-hidden p-4 transition-all duration-300 ease-out sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold text-foreground">Horas por dia</span>
          </div>
          <span className="text-xs text-muted-foreground">Saldo por dia</span>
        </div>
        <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1 sm:h-48 sm:gap-1.5">
          {dayMetrics.map((day) => {
            const workedHeight = `${Math.max(4, (day.worked / maxChartMinutes) * 100)}%`
            return (
              <div key={day.iso} className="flex min-w-6 flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center sm:h-40">
                  <span
                    className={cn(
                      "w-3 rounded-t transition-all duration-500 ease-out",
                      !day.bankable ? "bg-muted" : day.balance >= 0 ? "bg-positive" : "bg-negative",
                    )}
                    style={{ height: workedHeight }}
                    title={day.bankable ? `Trabalhado ${minutesToHHMM(day.worked)}` : "Sem banco"}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{day.iso.split("-")[2]}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Table2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold text-foreground">Planilha de horas</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSheet((current) => !current)}>
          {showSheet ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Table2 className="mr-1.5 h-4 w-4" />}
          {showSheet ? "Suspender" : "Exibir"}
        </Button>
      </div>

      {showSheet && (
      <div className="animate-fade-slide overflow-x-auto">
        <Card className="min-w-[24rem] overflow-hidden p-0 sm:min-w-0">
          <div className="grid grid-cols-[3rem_repeat(5,minmax(3.5rem,1fr))] border-b border-border bg-primary text-[9px] font-semibold uppercase tracking-wide text-primary-foreground sm:text-[11px]">
            <Cell className="sticky left-0 z-10 bg-primary justify-center">Dia</Cell>
            <Cell className="justify-center">Ent</Cell>
            <Cell className="justify-center">Pausa</Cell>
            <Cell className="justify-center">Retor</Cell>
            <Cell className="justify-center">Saída</Cell>
            <Cell className="justify-center">Saldo</Cell>
          </div>

          <div className="divide-y divide-border">
            {dayMetrics.map(({ iso, rec, just, hasPunch, bankable, balance, weekend, expected }) => {
              return (
                <div
                  key={iso}
                  className={cn(
                    "grid grid-cols-[3rem_repeat(5,minmax(3.5rem,1fr))] items-center text-sm",
                    weekend && "bg-muted/40",
                    rowToneClass({ expected, just }),
                  )}
                >
                  <div className="sticky left-0 z-10 flex flex-col items-center bg-inherit px-2 py-2 leading-tight">
                    <span className="text-xs font-bold text-foreground">{iso.split("-")[2]}</span>
                    <span className="text-[9px] capitalize text-muted-foreground sm:text-[10px]">{weekdayShort(iso)}</span>
                  </div>

                  {!hasPunch && just ? (
                    <>
                      <div className="col-span-4 px-2 py-2 sm:px-3">
                        <span className="inline-block max-w-full truncate rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground sm:px-2 sm:text-xs">
                          {JUSTIFICATION_LABELS[just.type]}
                          {just.startTime && just.endTime ? ` ${just.startTime}-${just.endTime}` : ""}
                        </span>
                      </div>
                      <BalanceCell bankable={bankable} balance={balance} />
                    </>
                  ) : (
                    <>
                      <TimeCell value={rec?.entry} tone="entry" />
                      <TimeCell value={rec?.breakTime} />
                      <TimeCell value={rec?.returnTime} />
                      <TimeCell value={rec?.exit} tone="exit" />
                      <BalanceCell bankable={bankable} balance={balance} />
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
      )}

      <p className="px-1 text-center text-xs text-muted-foreground">
        O banco soma dias fechados, faltas e abonos. Férias, folgas, atestados e faltas justificadas não entram no saldo. Jornada: {scheduleSummary(user.schedule)}.
      </p>
    </div>
  )
}

function CalendarCarousel({ ariaLabel, getValue, renderLabel, onChange, onShift, className }) {
  const slots = [-2, -1, 0, 1, 2]

  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
      <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => onShift(-1)} aria-label={`${ariaLabel} anterior`}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="relative h-16 min-w-0 overflow-hidden rounded-lg bg-primary/5" role="tablist" aria-label={ariaLabel}>
        <div className="absolute inset-x-0 top-1/2 h-11 -translate-y-1/2">
          {slots.map((slot) => {
            const itemValue = getValue(slot)
            const active = slot === 0
            return (
              <button
                key={`${ariaLabel}-${slot}-${itemValue}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(itemValue)}
                className={cn(
                  "absolute top-0 h-11 rounded-lg border px-3 text-sm font-semibold shadow-sm transition-all duration-300 ease-out will-change-transform",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active && "left-[22%] right-[22%] z-20 border-primary bg-primary text-primary-foreground",
                  slot === -1 && "left-[-5%] right-[73%] z-10 scale-90 border-primary/30 bg-white text-primary opacity-75",
                  slot === 1 && "left-[73%] right-[-5%] z-10 scale-90 border-primary/30 bg-white text-primary opacity-75",
                  slot === -2 && "left-[-32%] right-[96%] scale-[0.8] border-primary/20 bg-white text-primary opacity-25",
                  slot === 2 && "left-[96%] right-[-32%] scale-[0.8] border-primary/20 bg-white text-primary opacity-25",
                  className,
                )}
              >
                <span className="block truncate">{renderLabel(itemValue)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={() => onShift(1)} aria-label={`Próximo ${ariaLabel}`}>
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}

function Cell({ children, className }) {
  return <div className={cn("flex items-center px-2 py-2", className)}>{children}</div>
}

function TimeCell({ value, tone, className }) {
  return (
    <div className={cn("flex items-center justify-center px-2 py-2 font-mono text-xs tabular-nums", className)}>
      {value ? (
        <span
          className={cn(
            "font-semibold",
            tone === "entry" && "text-positive",
            tone === "exit" && "text-negative",
            !tone && "text-foreground",
          )}
        >
          {value}
        </span>
      ) : (
        <span className="text-muted-foreground/30">--:--</span>
      )}
    </div>
  )
}

function BalanceCell({ bankable, balance }) {
  return (
    <div className="flex items-center justify-center px-2 py-2 font-mono text-[10px] font-bold tabular-nums sm:text-xs">
      {!bankable ? (
        <span className="text-muted-foreground/40">-</span>
      ) : (
        <span className={balance >= 0 ? "text-positive" : "text-negative"}>{minutesToHHMM(balance)}</span>
      )}
    </div>
  )
}

function rowToneClass({ expected, just }) {
  if (just?.type === "ferias") return "bg-positive/10"
  if (just?.type === "falta") return "bg-negative/10"
  if (["abono", "atestado", "justificada"].includes(just?.type)) return "bg-chart-3/15"
  if (just?.type === "folga" || expected === 0) return "bg-primary/10"
  return ""
}

function SummaryCard({ label, value, tone = "default" }) {
  return (
    <Card className="flex flex-col items-center gap-1 p-3 sm:p-4">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">{label}</span>
      <span
        className={cn(
          "font-mono text-sm font-bold tabular-nums sm:text-base",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </span>
    </Card>
  )
}
