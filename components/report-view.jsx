"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, EyeOff, Table2 } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import { getMonthJustifications, getMonthRecords } from "@/lib/store"
import {
  expectedMinutes,
  minutesToHHMM,
  monthName,
  scheduleSummary,
  toISODate,
  weekdayShort,
  workedMinutes,
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

  const recordsByDate = useMemo(() => {
    const map = new Map()
    records.forEach((r) => map.set(r.date, r))
    return map
  }, [records])

  const justByDate = useMemo(() => {
    const map = new Map()
    justifications.forEach((j) => map.set(j.date, j))
    return map
  }, [justifications])

  if (!user) return null

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(cursor.year, cursor.month, i + 1)
    return toISODate(d)
  })
  const dayMetrics = days.map((iso) => {
    const rec = recordsByDate.get(iso)
    const just = justByDate.get(iso)
    const worked = workedMinutes(rec)
    const hasPunch = !!(rec?.entry || rec?.breakTime || rec?.returnTime || rec?.exit)
    const expected = expectedMinutes(iso, user.schedule)
    return {
      iso,
      rec,
      just,
      worked,
      expected,
      hasPunch,
      balance: hasPunch ? worked - expected : null,
      weekend: [0, 6].includes(new Date(iso + "T00:00:00").getDay()),
    }
  })
  const maxChartMinutes = Math.max(60, ...dayMetrics.map((day) => Math.max(day.worked, day.expected)))

  let totalWorked = 0
  let totalBalance = 0
  let workedDays = 0
  dayMetrics.forEach((day) => {
    if (day.hasPunch) {
      totalWorked += day.worked
      totalBalance += day.worked - day.expected
      workedDays += 1
    }
  })

  function shiftMonth(delta) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" className="touch-target shrink-0" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold capitalize text-foreground">
          {monthName(cursor.month)} de {cursor.year}
        </span>
        <Button variant="outline" size="icon" className="touch-target shrink-0" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
          <ChevronRight className="h-5 w-5" />
        </Button>
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
          <span className="text-xs text-muted-foreground">Trabalhado x jornada</span>
        </div>
        <div className="flex h-40 items-end gap-1 overflow-x-auto pb-1 sm:h-48 sm:gap-1.5">
          {dayMetrics.map((day) => {
            const workedHeight = `${Math.max(4, (day.worked / maxChartMinutes) * 100)}%`
            const expectedHeight = `${Math.max(4, (day.expected / maxChartMinutes) * 100)}%`
            return (
              <div key={day.iso} className="flex min-w-6 flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end justify-center gap-0.5 sm:h-40">
                  <span
                    className="w-2 rounded-t bg-primary/25 transition-all duration-500 ease-out"
                    style={{ height: expectedHeight }}
                    title={`Jornada ${minutesToHHMM(day.expected)}`}
                  />
                  <span
                    className={cn(
                      "w-2 rounded-t transition-all duration-500 ease-out",
                      day.balance == null
                        ? "bg-muted"
                        : day.balance >= 0
                          ? "bg-positive"
                          : "bg-negative",
                    )}
                    style={{ height: workedHeight }}
                    title={`Trabalhado ${minutesToHHMM(day.worked)}`}
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
            {dayMetrics.map(({ iso, rec, just, hasPunch, balance, weekend }) => {
              return (
                <div
                  key={iso}
                  className={cn(
                    "grid grid-cols-[3rem_repeat(5,minmax(3.5rem,1fr))] items-center text-sm",
                    weekend && "bg-muted/40",
                  )}
                >
                  <div className="sticky left-0 z-10 flex flex-col items-center bg-inherit px-2 py-2 leading-tight">
                    <span className="text-xs font-bold text-foreground">{iso.split("-")[2]}</span>
                    <span className="text-[9px] capitalize text-muted-foreground sm:text-[10px]">{weekdayShort(iso)}</span>
                  </div>

                  {!hasPunch && just ? (
                    <div className="col-span-5 px-2 py-2 sm:px-3">
                      <span className="inline-block max-w-full truncate rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground sm:px-2 sm:text-xs">
                        {JUSTIFICATION_LABELS[just.type]}
                      </span>
                    </div>
                  ) : (
                    <>
                      <TimeCell value={rec?.entry} tone="entry" />
                      <TimeCell value={rec?.breakTime} />
                      <TimeCell value={rec?.returnTime} />
                      <TimeCell value={rec?.exit} tone="exit" />
                      <div className="flex items-center justify-center px-2 py-2 font-mono text-[10px] font-bold tabular-nums sm:text-xs">
                        {balance == null ? (
                          <span className="text-muted-foreground/40">-</span>
                        ) : (
                          <span className={balance >= 0 ? "text-positive" : "text-negative"}>
                            {minutesToHHMM(balance)}
                          </span>
                        )}
                      </div>
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
        O banco de horas soma apenas os dias com ponto registrado. Jornada: {scheduleSummary(user.schedule)}.
      </p>
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
