"use client"

/**
 * Tela de relatorio de ponto.
 *
 * Apresenta totais, grafico mensal e planilha editavel para ajustes manuais
 * sem misturar a regra de calculo com a camada de persistencia.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, EyeOff, Save, Table2 } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth/auth-context"
import { adjustRecord, getJustifications, getMonthJustifications, getMonthRecords, getRecords } from "@/lib/data/store"
import {
  activeWorkedMinutes,
  bankMetrics,
  currentTime,
  minutesToHHMM,
  monthName,
  scheduleSummary,
  todayISO,
  toISODate,
  weekdayShort,
  parseISODate,
  timeToMinutes,
} from "@/lib/time/time-utils"
import { JUSTIFICATION_LABELS } from "@/lib/data/types"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ContextualTip } from "@/components/onboarding/onboarding"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

/**
 * Componente responsavel pela consulta e ajuste dos registros de ponto.
 */
export function ReportView({ cursorOverride, onCursorOverrideApplied }) {
  const { user } = useAuth()
  const now = new Date()
  const chartScrollRef = useRef(null)
  const autoScrollKeyRef = useRef(null)
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showSheet, setShowSheet] = useState(true)
  const [editDate, setEditDate] = useState(null)
  const [editValues, setEditValues] = useState({ entry: "", breakTime: "", returnTime: "", exit: "" })
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [activeTime, setActiveTime] = useState(currentTime(user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60))

  useEffect(() => {
    if (!cursorOverride) return
    setCursor(cursorOverride)
    onCursorOverrideApplied?.()
  }, [cursorOverride, onCursorOverrideApplied])

  const records = useStoreData(() => (user ? getMonthRecords(user.id, cursor.year, cursor.month) : []))
  const justifications = useStoreData(() =>
    user ? getMonthJustifications(user.id, cursor.year, cursor.month) : [],
  )
  const allRecords = useStoreData(() => (user ? getRecords().filter((item) => item.userId === user.id) : []))
  const allJustifications = useStoreData(() =>
    user ? getJustifications().filter((item) => item.userId === user.id) : [],
  )
  const schedule = user?.schedule ?? []

  useEffect(() => {
    const hasOpenToday = records.some((record) => record.date === todayISO() && record.entry && !record.exit)
    if (!hasOpenToday) return

    const offset = user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60
    const update = () => setActiveTime(currentTime(offset))
    update()

    let intervalId
    const nowDate = new Date()
    const msToNextMinute = (60 - nowDate.getSeconds()) * 1000 - nowDate.getMilliseconds()
    const timeoutId = window.setTimeout(() => {
      update()
      intervalId = window.setInterval(update, 60_000)
    }, msToNextMinute)

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId) window.clearInterval(intervalId)
    }
  }, [records, user?.clockOffsetMinutes, user?.clockOffsetSeconds])

  const { dayMetrics, maxChartMinutes, averageWorked, monthSummary } = useMemo(() => {
    const recordsByDate = new Map(records.map((record) => [record.date, record]))
    const justByDate = new Map(justifications.map((justification) => [justification.date, justification]))
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const metrics = Array.from({ length: daysInMonth }, (_, index) => {
      const iso = toISODate(new Date(cursor.year, cursor.month, index + 1))
      const rec = recordsByDate.get(iso)
      const just = justByDate.get(iso)
      const metrics = bankMetrics(iso, rec, schedule, just)
      const activeOpen = iso === todayISO() && !!rec?.entry && !metrics.closed
      const displayWorked = activeOpen ? activeWorkedMinutes(rec, activeTime) : metrics.worked
      return {
        iso,
        rec,
        just,
        ...metrics,
        worked: displayWorked,
        bankWorked: metrics.worked,
        activeOpen,
        weekend: [0, 6].includes(parseISODate(iso).getDay()),
      }
    })

    const bankable = metrics.filter((day) => day.bankable)
    const workedDays = metrics.filter((day) => day.bankable || day.activeOpen)

    return {
      dayMetrics: metrics,
      maxChartMinutes: Math.max(60, ...metrics.map((day) => Math.max(day.worked, day.expected))),
      averageWorked: workedDays.length > 0 ? workedDays.reduce((total, day) => total + day.worked, 0) / workedDays.length : 0,
      monthSummary: workedDays.reduce(
        (acc, day) => {
          acc.worked += day.worked
          if (day.bankable) acc.balance += day.balance
          acc.days += 1
          return acc
        },
        { worked: 0, balance: 0, days: 0 },
      ),
    }
  }, [activeTime, cursor.month, cursor.year, justifications, records, schedule])

  const totalSummary = useMemo(
    () => buildTotalSummary(allRecords, allJustifications, schedule),
    [allJustifications, allRecords, schedule],
  )

  const chartMonthKey = dayMetrics[0]?.iso.slice(0, 7) ?? ""

  useEffect(() => {
    // Auto-scroll só na primeira abertura do mês atual; depois disso o usuário controla o scroll.
    if (autoScrollKeyRef.current === chartMonthKey) return
    if (!dayMetrics.some((day) => day.iso === todayISO())) return

    autoScrollKeyRef.current = chartMonthKey
    scrollChartToToday(chartScrollRef.current, todayISO())
  }, [chartMonthKey, dayMetrics])

  if (!user) return null

  const editDay = dayMetrics.find((day) => day.iso === editDate)
  const chartMaxMinutes = Math.max(maxChartMinutes, averageWorked, 60)
  const monthAverageTop = `${100 - Math.min(100, (averageWorked / chartMaxMinutes) * 100)}%`
  // A trilha precisa ter largura real do mês para a linha média acompanhar todos os dias no scroll.
  const chartTrackStyle = {
    minWidth: `${Math.max(dayMetrics.length * 32, 320)}px`,
  }

  /**
   * Preenche o modal com os horarios existentes do dia selecionado.
   */
  function openEdit(day) {
    if (day.iso > todayISO()) {
      toast.info("Não é permitido editar a planilha de uma data futura.")
      return
    }

    setEditDate(day.iso)
    setEditValues({
      entry: day.rec?.entry ?? "",
      breakTime: day.rec?.breakTime ?? "",
      returnTime: day.rec?.returnTime ?? "",
      exit: day.rec?.exit ?? "",
    })
  }

  /**
   * Valida a ordem cronologica das batidas antes de salvar ajustes manuais.
   */
  async function saveEdit() {
    if (!editDate) return

    const entry = timeToMinutes(editValues.entry)
    const breakTime = timeToMinutes(editValues.breakTime)
    const returnTime = timeToMinutes(editValues.returnTime)
    const exit = timeToMinutes(editValues.exit)

    if (editValues.breakTime && !editValues.entry) {
      toast.error("Informe a entrada antes da pausa.")
      return
    }
    if (editValues.returnTime && !editValues.breakTime) {
      toast.error("Informe a pausa antes do retorno.")
      return
    }
    if (editValues.exit && !editValues.entry) {
      toast.error("Informe a entrada antes da saída.")
      return
    }
    if (editValues.breakTime && editValues.exit && !editValues.returnTime) {
      toast.error("Informe o retorno antes da saída quando houver pausa.")
      return
    }
    if (entry != null && breakTime != null && breakTime <= entry) {
      toast.error("A pausa deve ser depois da entrada.")
      return
    }
    if (breakTime != null && returnTime != null && returnTime <= breakTime) {
      toast.error("O retorno deve ser depois da pausa.")
      return
    }
    if (returnTime != null && exit != null && exit <= returnTime) {
      toast.error("A saída deve ser depois do retorno.")
      return
    }
    if (entry != null && exit != null && exit <= entry) {
      toast.error("A saída deve ser depois da entrada.")
      return
    }

    const res = await adjustRecord(user.id, editDate, editValues)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success("Ponto ajustado.")
    setEditDate(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/90 p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:gap-3.5 sm:p-4" data-tour-id="relatorio-filters">
        <SwipeCalendarCarousel
          ariaLabel="Selecionar mês do relatório"
          getValue={(offset) => (cursor.month + offset + 12) % 12}
          renderLabel={(month) => monthName(month)}
          onChange={(month) => setCursor((current) => ({ ...current, month }))}
          onShift={(delta) => setCursor((current) => ({ ...current, month: (current.month + delta + 12) % 12 }))}
          className="capitalize"
        />
        <SwipeCalendarCarousel
          ariaLabel="Selecionar ano do relatório"
          getValue={(offset) => cursor.year + offset}
          renderLabel={(year) => year}
          onChange={(year) => setCursor((current) => ({ ...current, year }))}
          onShift={(delta) => setCursor((current) => ({ ...current, year: current.year + delta }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-3.5">
        <SummaryCard label="Trabalhado" value={minutesToHHMM(totalSummary.worked)} />
        <SummaryCard label="Dias" value={String(totalSummary.days)} />
        <SummaryCard
          label="Banco total"
          value={minutesToHHMM(totalSummary.balance)}
          tone={totalSummary.balance >= 0 ? "positive" : "negative"}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-3.5">
        <SummaryCard label="Trabalho mês" value={minutesToHHMM(monthSummary.worked)} />
        <SummaryCard label="Dias mês" value={String(monthSummary.days)} />
        <SummaryCard
          label="Banco mês"
          value={minutesToHHMM(monthSummary.balance)}
          tone={monthSummary.balance >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="overflow-hidden p-5 transition-all duration-300 ease-out">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-semibold text-foreground">Horas por dia</span>
          </div>
          <span className="text-xs text-muted-foreground">Saldo por dia</span>
        </div>
        <div ref={chartScrollRef} className="thin-scrollbar h-40 overflow-x-auto pb-1 sm:h-48">
          <div className="relative flex h-full w-full items-end gap-1 sm:gap-1.5" style={chartTrackStyle}>
            {averageWorked > 0 && (
              <span
                className="pointer-events-none absolute inset-x-0 z-10 block border-t border-dashed border-chart-3/80"
                style={{ top: monthAverageTop }}
                title={`Média mensal ${minutesToHHMM(Math.round(averageWorked))}`}
              />
            )}
            {dayMetrics.map((day) => {
              const workedHeight = `${Math.max(4, (day.worked / chartMaxMinutes) * 100)}%`
              const focused = day.iso === editDate || day.iso === todayISO()
              return (
                <div
                  key={day.iso}
                  data-day-iso={day.iso}
                  className={cn(
                    "group/day flex min-w-6 flex-1 cursor-default flex-col items-center gap-1 rounded-md px-0.5 outline-none transition-all duration-200 ease-out hover:bg-primary/5",
                    focused && "bg-primary/10",
                  )}
                  title={dayTitle(day)}
                >
                  <div className="flex h-32 w-full items-end justify-center sm:h-40">
                    <span
                      className={cn(
                        "w-3 origin-bottom rounded-t transition-all duration-500 ease-out group-hover/day:scale-y-105",
                        chartBarClass(day),
                        focused && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      )}
                      style={{ height: workedHeight }}
                      title={dayTitle(day)}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.iso.split("-")[2]}</span>
                </div>
              )
            })}
          </div>
        </div>
        <ChartLegend />
      </Card>

      <div className="rounded-2xl border border-border/80 bg-accent/35 px-4 py-3 text-center text-xs font-medium leading-5 text-accent-foreground">
        Para ajustar entrada, pausa, retorno ou saída, clique em uma linha da planilha.
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Table2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold text-foreground">Planilha de horas</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" className="h-10 px-3 text-xs sm:text-sm" onClick={() => setShowSheet((current) => !current)}>
            {showSheet ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Table2 className="mr-1.5 h-4 w-4" />}
            {showSheet ? "Suspender" : "Exibir"}
          </Button>
        </div>
      </div>

      <ContextualTip>
        Use filtros de mês e ano antes de ajustar registros. Exemplo: confira abril antes de corrigir uma saída esquecida.
      </ContextualTip>

      <div
        data-tour-id="relatorio-sheet"
        className={cn(
          "overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out",
          showSheet ? "max-h-[2200px] opacity-100" : "pointer-events-none max-h-0 -translate-y-1 opacity-0",
        )}
        aria-hidden={!showSheet}
      >
        <div className="rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <Card className="mx-auto min-w-[21.5rem] max-w-full overflow-hidden p-0 sm:min-w-0">
              <div className="grid grid-cols-[2.75rem_repeat(5,minmax(3.25rem,1fr))] border-b border-border bg-primary text-[9px] font-semibold uppercase tracking-wide text-primary-foreground sm:grid-cols-[3rem_repeat(5,minmax(3.5rem,1fr))] sm:text-[11px]">
                <Cell className="sticky left-0 z-10 bg-primary justify-center">Dia</Cell>
                <Cell className="justify-center">Ent</Cell>
                <Cell className="justify-center">Pausa</Cell>
                <Cell className="justify-center">Retor</Cell>
                <Cell className="justify-center">Saída</Cell>
                <Cell className="justify-center">Saldo</Cell>
              </div>

              <div className="divide-y divide-border">
                {dayMetrics.map((day) => {
                  const { iso, rec, just, hasPunch, bankable, balance, weekend, expected } = day
                  const onlyStatus = !hasPunch && (just || expected === 0)
                  const isFuture = iso > todayISO()
                  return (
                    <div
                      key={iso}
                      role={isFuture ? undefined : "button"}
                      tabIndex={showSheet && !isFuture ? 0 : -1}
                      onClick={() => openEdit(day)}
                      onKeyDown={(event) => {
                        if (!isFuture && (event.key === "Enter" || event.key === " ")) openEdit(day)
                      }}
                      aria-disabled={isFuture || undefined}
                      className={cn(
                        "grid grid-cols-[2.75rem_repeat(5,minmax(3.25rem,1fr))] items-center text-sm transition-all duration-200 ease-out sm:grid-cols-[3rem_repeat(5,minmax(3.5rem,1fr))]",
                        isFuture
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:bg-primary/5 hover:shadow-sm focus-visible:bg-primary/5 focus-visible:outline-none",
                        weekend && "bg-muted/40",
                        rowToneClass({ expected, just }),
                        iso === editDate && "ring-2 ring-primary/40",
                      )}
                    >
                      <div className="sticky left-0 z-10 flex flex-col items-center bg-inherit px-1.5 py-2 leading-tight sm:px-2">
                        <span className="text-xs font-bold text-foreground">{iso.split("-")[2]}</span>
                        <span className="text-[9px] capitalize text-muted-foreground sm:text-[10px]">{weekdayShort(iso)}</span>
                      </div>

                      {onlyStatus ? (
                        <>
                          <div className="col-span-4 px-2 py-2 sm:px-3">
                            <span className={cn("inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-xs", statusPillClass({ expected, just }))}>
                              {just ? JUSTIFICATION_LABELS[just.type] : "Folga"}
                              {just?.startTime && just?.endTime ? ` ${just.startTime}-${just.endTime}` : ""}
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
        </div>
      </div>

      <p className="px-1 text-center text-xs text-muted-foreground">
        O banco mensal soma dias fechados, faltas e abonos. Férias, folgas, feriados, atestados e faltas justificadas não entram no saldo. Jornada: {scheduleSummary(user.schedule)}.
      </p>

      <Dialog open={!!editDate} onOpenChange={(open) => !open && setEditDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar horas do dia</DialogTitle>
            <DialogDescription>{editDay ? `${weekdayShort(editDay.iso)}, ${editDay.iso.split("-")[2]}/${editDay.iso.split("-")[1]}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ["entry", "Entrada"],
              ["breakTime", "Pausa"],
              ["returnTime", "Retorno"],
              ["exit", "Saída"],
            ].map(([key, label]) => (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={`report-${key}`}>{label}</Label>
                <Input
                  id={`report-${key}`}
                  type="time"
                  value={editValues[key]}
                  onChange={(event) => setEditValues((current) => ({ ...current, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditDate(null)}>Cancelar</Button>
            <Button type="button" onClick={() => setConfirmSaveOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              Salvar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ajuste?</AlertDialogTitle>
            <AlertDialogDescription>
              As horas do dia selecionado serão atualizadas no relatório e no banco de horas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmSaveOpen(false)
                await saveEdit()
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * Controle compacto para navegar entre meses ou anos mantendo o item atual em destaque.
 */
function SwipeCalendarCarousel({ ariaLabel, getValue, renderLabel, onChange, onShift, className }) {
  const slots = [-2, -1, 0, 1, 2]
  const dragRef = useRef({ startX: 0, startY: 0, pointerId: null })
  const suppressClickRef = useRef(false)

  function handlePointerDown(event) {
    dragRef.current = { startX: event.clientX, startY: event.clientY, pointerId: event.pointerId }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerUp(event) {
    if (dragRef.current.pointerId !== event.pointerId) return

    const deltaX = event.clientX - dragRef.current.startX
    const deltaY = event.clientY - dragRef.current.startY
    dragRef.current = { startX: 0, startY: 0, pointerId: null }

    if (Math.abs(deltaX) < 34 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) return

    suppressClickRef.current = true
    onShift(deltaX > 0 ? -1 : 1)
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
  }

  return (
    <div className="relative">
      <div
        className="relative h-14 min-w-0 cursor-grab touch-pan-y overflow-hidden rounded-2xl bg-background/20 ring-1 ring-border/60 active:cursor-grabbing sm:h-16"
        role="tablist"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragRef.current = { startX: 0, startY: 0, pointerId: null }
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 sm:h-11">
          {slots.map((slot) => {
            const itemValue = getValue(slot)
            const active = slot === 0
            return (
              <button
                key={`${ariaLabel}-${slot}-${itemValue}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (suppressClickRef.current) return
                  onChange(itemValue)
                }}
                className={cn(
                  "absolute top-0 h-10 rounded-xl border px-2 text-xs font-semibold transition-all duration-300 ease-out will-change-transform sm:h-11 sm:px-3 sm:text-sm",
                  "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active && "left-[29%] right-[29%] z-10 border-primary bg-primary text-sm text-primary-foreground sm:left-[24%] sm:right-[24%]",
                  slot === -1 && "left-[12%] right-[72%] z-10 scale-90 border-transparent bg-transparent text-primary/75 opacity-50 sm:left-[5%] sm:right-[76%] sm:opacity-65",
                  slot === 1 && "left-[72%] right-[12%] z-10 scale-90 border-transparent bg-transparent text-primary/75 opacity-50 sm:left-[76%] sm:right-[5%] sm:opacity-65",
                  slot === -2 && "left-[-28%] right-[96%] scale-[0.8] border-transparent bg-transparent text-primary opacity-0 sm:left-[-20%] sm:right-[95%] sm:opacity-20",
                  slot === 2 && "left-[96%] right-[-28%] scale-[0.8] border-transparent bg-transparent text-primary opacity-0 sm:left-[95%] sm:right-[-20%] sm:opacity-20",
                  className,
                )}
              >
                <span className="block truncate">{renderLabel(itemValue)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 z-10 h-9 w-9 rounded-full border border-border/65 bg-card/90 text-muted-foreground shadow-none backdrop-blur hover:bg-accent/60 hover:text-foreground sm:left-2"
        style={{ transform: "translateY(-50%)" }}
        onClick={() => onShift(-1)}
        aria-label={`${ariaLabel} anterior`}
      >
        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 z-10 h-9 w-9 rounded-full border border-border/65 bg-card/90 text-muted-foreground shadow-none backdrop-blur hover:bg-accent/60 hover:text-foreground sm:right-2"
        style={{ transform: "translateY(-50%)" }}
        onClick={() => onShift(1)}
        aria-label={`Proximo ${ariaLabel}`}
      >
        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    </div>
  )
}

/**
 * Legenda das cores usadas no grafico de saldo diario.
 */
function ChartLegend() {
  const items = [
    ["bg-positive", "Positivo"],
    ["bg-negative", "Negativo"],
    ["bg-primary/45", "Folga"],
    ["bg-chart-3", "Justificado"],
    ["bg-chart-5", "Feriado"],
    ["bg-chart-6", "Em andamento"],
    ["border-chart-3/80", "Média mês"],
  ]

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      {items.map(([className, label]) => (
        <span key={label} className="inline-flex items-center gap-1">
          <span className={cn(label.startsWith("Média") ? "h-px w-3 border-t border-dashed" : "h-2 w-2 rounded-full", className)} />
          {label}
        </span>
      ))}
    </div>
  )
}

/**
 * Soma o historico completo considerando apenas dias que entram no banco de horas.
 */
function buildTotalSummary(records, justifications, schedule) {
  const recordsByDate = new Map(records.map((record) => [record.date, record]))
  const justByDate = new Map(justifications.map((justification) => [justification.date, justification]))
  const dates = new Set([...recordsByDate.keys(), ...justByDate.keys()])

  return Array.from(dates).reduce(
    (acc, iso) => {
      const metrics = bankMetrics(iso, recordsByDate.get(iso), schedule, justByDate.get(iso))
      if (metrics.bankable) {
        acc.worked += metrics.worked
        acc.balance += metrics.balance
        acc.days += 1
      }
      return acc
    },
    { worked: 0, balance: 0, days: 0 },
  )
}

/**
 * Centraliza o dia atual no grafico quando o mes atual e aberto.
 */
function scrollChartToToday(container, today) {
  if (!container) return
  window.requestAnimationFrame(() => {
    const target = container.querySelector(`[data-day-iso="${today}"]`)
    if (!target) return

    const targetCenter = target.offsetLeft + target.offsetWidth / 2
    const nextScroll = Math.max(0, targetCenter - container.clientWidth / 2)
    container.scrollTo({ left: nextScroll, behavior: "auto" })
  })
}

/**
 * Define a cor da barra conforme justificativa, folga e saldo do dia.
 */
function chartBarClass(day) {
  if (day.just?.type === "feriado") return "bg-chart-5"
  if (day.just?.type === "folga" || day.expected === 0) return "bg-primary/45"
  if (["justificada", "abono", "atestado"].includes(day.just?.type)) return "bg-chart-3"
  if (day.just?.type === "ferias") return "bg-positive/60"
  if (day.just?.type === "falta") return "bg-negative"
  if (day.activeOpen) return "bg-chart-6"
  if (!day.bankable) return "bg-muted"
  return day.balance >= 0 ? "bg-positive" : "bg-negative"
}

/**
 * Gera o texto de contexto exibido no tooltip do dia.
 */
function dayTitle(day) {
  if (day.just?.type) return JUSTIFICATION_LABELS[day.just.type] || "Justificativa"
  if (day.expected === 0) return "Folga"
  return day.bankable ? `Trabalhado ${minutesToHHMM(day.worked)}` : "Sem banco"
}

/**
 * Celula base da planilha responsiva.
 */
function Cell({ children, className }) {
  return <div className={cn("flex items-center px-1.5 py-2 sm:px-2", className)}>{children}</div>
}

/**
 * Celula de horario com destaque visual para entrada e saida.
 */
function TimeCell({ value, tone, className }) {
  return (
    <div className={cn("flex items-center justify-center px-1.5 py-2 font-mono text-[11px] tabular-nums sm:px-2 sm:text-xs", className)}>
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

/**
 * Celula de saldo que oculta dias sem impacto no banco.
 */
function BalanceCell({ bankable, balance }) {
  return (
    <div className="flex items-center justify-center px-1.5 py-2 font-mono text-[10px] font-bold tabular-nums sm:px-2 sm:text-xs">
      {!bankable ? (
        <span className="text-muted-foreground/40">-</span>
      ) : (
        <span className={balance >= 0 ? "text-positive" : "text-negative"}>{minutesToHHMM(balance)}</span>
      )}
    </div>
  )
}

/**
 * Define o fundo da linha conforme justificativa ou dia sem jornada.
 */
function rowToneClass({ expected, just }) {
  if (just?.type === "ferias") return "bg-positive/10"
  if (just?.type === "feriado") return "bg-chart-5/15"
  if (just?.type === "falta") return "bg-negative/10"
  if (["abono", "atestado", "justificada"].includes(just?.type)) return "bg-chart-3/15"
  if (just?.type === "folga" || expected === 0) return "bg-primary/10"
  return ""
}

/**
 * Define o estilo do selo de status exibido em dias sem batida.
 */
function statusPillClass({ expected, just }) {
  if (just?.type === "feriado") return "bg-chart-5/15 text-chart-5"
  if (just?.type === "folga" || expected === 0) return "bg-primary/10 text-primary"
  if (just?.type === "ferias") return "bg-positive/10 text-positive"
  if (just?.type === "falta") return "bg-negative/10 text-negative"
  return "bg-chart-3/15 text-chart-3"
}

/**
 * Card compacto para totais de relatorio.
 */
function SummaryCard({ label, value, tone = "default" }) {
  return (
    <Card className="flex flex-col items-center gap-1.5 p-4">
      <span className="text-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">{label}</span>
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
