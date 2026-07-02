"use client"

/**
 * Tela principal de batida de ponto.
 *
 * Controla o relogio da empresa, valida a ordem das batidas do dia
 * e resume o banco de horas recente do usuario autenticado.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { BarChart3, ChevronLeft, ChevronRight, DoorOpen, LogIn, LogOut, Coffee, Utensils, Check } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth/auth-context"
import {
  getJustification,
  getJustifications,
  getMonthJustifications,
  getMonthRecords,
  getRecord,
  getRecords,
  punch,
} from "@/lib/data/store"
import {
  activeWorkedMinutes,
  bankMetrics,
  currentTime,
  currentTimeWithSeconds,
  friendlyDate,
  minutesToHHMM,
  monthName,
  toISODate,
  todayISO,
  parseISODate,
} from "@/lib/time/time-utils"
import { JUSTIFICATION_LABELS } from "@/lib/data/types"
import { cn } from "@/lib/utils/utils"
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

/**
 * Calcula quais batidas podem ser feitas agora respeitando ordem e configuracao diaria.
 */
function nextAllowedFields(record, configuredKeys) {
  if (!configuredKeys.includes("entry") || !record?.entry) return configuredKeys.includes("entry") ? ["entry"] : []
  if (record.breakTime && configuredKeys.includes("returnTime") && !record.returnTime) return ["returnTime"]
  if (record.returnTime && configuredKeys.includes("exit") && !record.exit) return ["exit"]
  if (!record.breakTime && !record.exit) {
    return ["breakTime", "exit"].filter((field) => configuredKeys.includes(field))
  }
  return []
}

/**
 * Traduz a proxima etapa esperada em uma mensagem de orientacao para o usuario.
 */
function punchOrderMessage(nextFields) {
  if (nextFields.includes("entry")) return "Comece o dia registrando a entrada."
  if (nextFields.includes("breakTime") && nextFields.includes("exit")) return "Depois da entrada, registre a pausa ou a saída."
  if (nextFields.includes("breakTime")) return "Depois da entrada, registre a pausa."
  if (nextFields.includes("returnTime")) return "Depois da pausa, registre o retorno."
  if (nextFields.includes("exit")) return "Agora registre a saída."
  return "Siga a ordem das batidas do dia."
}

/**
 * Componente responsavel pelo registro diario de ponto e resumo visual do mes.
 */
export function PunchView() {
  const { user } = useAuth()
  const [date, setDate] = useState(todayISO())
  const [clockNow, setClockNow] = useState(
    currentTimeWithSeconds(user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60),
  )
  const [workNow, setWorkNow] = useState(currentTime(user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60))
  const today = todayISO()
  const isToday = date === today
  const dayIndex = parseISODate(date).getDay()

  useEffect(() => {
    if (!isToday) return
    const offset = user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60
    setClockNow(currentTimeWithSeconds(offset))
    const id = window.setInterval(() => setClockNow(currentTimeWithSeconds(offset)), 1_000)
    return () => window.clearInterval(id)
  }, [isToday, user?.clockOffsetMinutes, user?.clockOffsetSeconds])

  const record = useStoreData(() => (user ? getRecord(user.id, date) : undefined))
  const justification = useStoreData(() => (user ? getJustification(user.id, date) : undefined))
  const monthRecords = useStoreData(() =>
    user ? getMonthRecords(user.id, parseISODate(date).getFullYear(), parseISODate(date).getMonth()) : [],
  )
  const monthJustifications = useStoreData(() =>
    user ? getMonthJustifications(user.id, parseISODate(date).getFullYear(), parseISODate(date).getMonth()) : [],
  )
  const allRecords = useStoreData(() => (user ? getRecords().filter((item) => item.userId === user.id) : []))
  const allJustifications = useStoreData(() =>
    user ? getJustifications().filter((item) => item.userId === user.id) : [],
  )

  const schedule = user?.schedule ?? []
  const metrics = bankMetrics(date, record, schedule, justification)
  const { worked, expected, balance } = metrics
  const hasEntry = !!record?.entry
  const hasAnyPunch = !!(record?.entry || record?.breakTime || record?.returnTime || record?.exit)
  const isClosed = metrics.closed
  const configuredKeys = Array.isArray(user?.punchFields?.[dayIndex]) ? user.punchFields[dayIndex] : FULL_DAY_KEYS
  const activeFields = FIELDS.filter((f) => configuredKeys.includes(f.key))
  const nextFields = nextAllowedFields(record, activeFields.map((field) => field.key))
  const showDayBalance = isClosed && metrics.bankable
  const activeWorked = hasEntry ? activeWorkedMinutes(record, workNow) : 0

  useEffect(() => {
    if (!isToday || !hasEntry || isClosed) return
    const offset = user?.clockOffsetSeconds ?? (user?.clockOffsetMinutes ?? 0) * 60
    const update = () => setWorkNow(currentTime(offset))
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
  }, [hasEntry, isClosed, isToday, user?.clockOffsetMinutes, user?.clockOffsetSeconds])
  const monthChart = useMemo(
    () => buildMonthChart(date, monthRecords, monthJustifications, schedule, workNow),
    [date, monthJustifications, monthRecords, schedule, workNow],
  )
  const totalAverageWorked = useMemo(
    () => buildAverageWorked(allRecords, allJustifications, schedule),
    [allJustifications, allRecords, schedule],
  )

  if (!user) return null

  /**
   * Navega entre dias sem permitir selecao de datas futuras.
   */
  function shiftDay(delta) {
    const d = parseISODate(date)
    d.setDate(d.getDate() + delta)
    const iso = toISODate(d)
    if (iso > today) return
    setDate(iso)
  }

  /**
   * Registra uma batida depois de validar data, duplicidade, configuracao e ordem.
   */
  async function handlePunch(field) {
    if (!isToday) {
      toast.info("Só é possível bater ponto no dia de hoje. Para corrigir outro dia, use Relatório.")
      return
    }
    if (record?.[field]) {
      toast.info(`${PUNCH_LABELS[field]} já registrada às ${record[field]}.`)
      return
    }
    if (!activeFields.some((item) => item.key === field)) {
      toast.info("Esta batida não está configurada para este dia.")
      return
    }
    if (nextFields.length === 0) {
      toast.info(isClosed ? "O ponto do dia já foi fechado." : "Nenhuma batida disponível para este dia.")
      return
    }
    if (!nextFields.includes(field)) {
      toast.info(punchOrderMessage(nextFields))
      return
    }
    if (field === "returnTime" && !record?.breakTime) {
      toast.info("Registre a pausa antes do retorno.")
      return
    }
    const res = await punch(user.id, field)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success(`${PUNCH_LABELS[field]} registrada.`)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Button variant="outline" size="icon" className="touch-target shrink-0" onClick={() => shiftDay(-1)} aria-label="Dia anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center px-1 text-center">
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
        <div className="rounded-2xl border border-border/80 bg-card/80 px-4 py-5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium uppercase text-primary/80">Relógio da empresa</p>
          <p className="mt-1 font-mono text-4xl font-bold leading-none tabular-nums text-primary">{clockNow}</p>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-3 divide-x divide-border">
          <DaySummary label={isClosed ? "Trabalhado" : "Trabalhando"} value={hasEntry ? minutesToHHMM(activeWorked) : "--:--"} tone={!isClosed && hasEntry ? "active" : "default"} />
          <DaySummary label="Jornada" value={expected > 0 ? minutesToHHMM(expected) : "Folga"} />
          <DaySummary label="Saldo" value={showDayBalance ? minutesToHHMM(balance) : "--:--"} tone={!showDayBalance ? "muted" : balance >= 0 ? "positive" : "negative"} />
        </div>
      </Card>

      {justification && (
        <div className="rounded-lg border border-border bg-accent/40 px-4 py-3 text-sm">
          <span className="font-semibold text-accent-foreground">{JUSTIFICATION_LABELS[justification.type]}</span>
          {justification.reason && <span className="text-muted-foreground"> - {justification.reason}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
        {activeFields.map(({ key, label, icon: Icon, tone }) => {
          const value = record?.[key] ?? null
          const needsBreakFirst = key === "returnTime" && !record?.breakTime
          const canPunch = isToday && !value && nextFields.includes(key)
          return (
            <button
              key={key}
              onClick={() => handlePunch(key)}
              className={cn(
                "group/punch relative flex min-h-[7.25rem] flex-col items-start justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-[0.98] sm:min-h-[7.75rem] sm:p-4 dark:hover:shadow-none",
                punchCardClass({ tone, value, canPunch }),
                !value && !isToday && "opacity-60",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 ease-out group-hover/punch:scale-105",
                    punchIconClass({ tone, value, canPunch }),
                  )}
                >
                  {value ? <Check className="h-5 w-5 transition-transform duration-300 ease-out group-hover/punch:scale-110" /> : <Icon className="h-5 w-5 transition-transform duration-300 ease-out group-hover/punch:scale-110" />}
                </span>
                {value && <span className="text-xs font-medium opacity-90">registrado</span>}
                {!value && canPunch && !needsBreakFirst && <span className={cn("text-xs font-medium", punchTextClass(tone))}>tocar p/ registrar</span>}
                {!value && !canPunch && <span className={cn("text-xs font-medium", punchTextClass(tone))}>tocar p/ registrar</span>}
              </div>
              <div>
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    value ? "text-current/80" : punchTextClass(tone),
                  )}
                >
                  {label}
                </span>
                <p
                  className={cn(
                    "font-mono text-xl font-bold tabular-nums sm:text-2xl",
                    value ? "text-current" : punchTextClass(tone),
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

      <MonthOverview chart={monthChart} selectedDate={date} totalAverageWorked={totalAverageWorked} />
    </div>
  )
}

/**
 * Monta a serie mensal usada no grafico, incluindo dias em aberto e justificativas.
 */
function buildMonthChart(date, records, justifications, schedule, activeTime) {
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
    const justification = justByDate.get(iso)
    const metrics = bankMetrics(iso, record, schedule, justification)
    const activeOpen = iso === today && !!record?.entry && !metrics.closed
    const displayWorked = activeOpen ? activeWorkedMinutes(record, activeTime) : metrics.worked
    return {
      iso,
      day: String(index + 1).padStart(2, "0"),
      worked: displayWorked,
      bankWorked: metrics.worked,
      closed: metrics.closed,
      bankable: metrics.bankable,
      activeOpen,
      future: iso > today,
      balance: metrics.balance,
      expected: metrics.expected,
      just: justification,
    }
  })

  const bankableDays = days.filter((day) => day.bankable)
  const workedDays = days.filter((day) => day.bankable || day.activeOpen)
  const totalWorked = workedDays.reduce((total, day) => total + day.worked, 0)
  const totalBalance = bankableDays.reduce((total, day) => total + day.balance, 0)
  const averageWorked = workedDays.length > 0 ? totalWorked / workedDays.length : 0
  const maxMinutes = Math.max(60, ...days.map((day) => Math.max(day.worked, day.expected)))

  return {
    label: `${monthName(month)} de ${year}`,
    days,
    totalWorked,
    totalBalance,
    averageWorked,
    closedCount: workedDays.length,
    bankableCount: bankableDays.length,
    maxMinutes,
  }
}

/**
 * Calcula a media historica apenas sobre dias que entram no banco de horas.
 */
function buildAverageWorked(records, justifications, schedule) {
  const justByDate = new Map(justifications.map((justification) => [justification.date, justification]))
  const bankable = records
    .map((record) => bankMetrics(record.date, record, schedule, justByDate.get(record.date)))
    .filter((metrics) => metrics.bankable)

  if (bankable.length === 0) return 0
  return bankable.reduce((total, metrics) => total + metrics.worked, 0) / bankable.length
}

/**
 * Exibe o resumo mensal com barras por dia e linha de media historica.
 */
function MonthOverview({ chart, selectedDate, totalAverageWorked }) {
  const scrollRef = useRef(null)
  const autoScrollKeyRef = useRef(null)
  const chartMaxMinutes = Math.max(chart.maxMinutes, totalAverageWorked, 60)
  const totalAverageTop = `${100 - Math.min(100, (totalAverageWorked / chartMaxMinutes) * 100)}%`
  const today = todayISO()
  const chartMonthKey = chart.days[0]?.iso.slice(0, 7) ?? ""
  // A trilha precisa ter largura real do mês para a linha média acompanhar todos os dias no scroll.
  const trackStyle = {
    minWidth: `${Math.max(chart.days.length * 32, 320)}px`,
  }

  useEffect(() => {
    // Auto-scroll só na primeira abertura do mês atual; depois disso o usuário controla o scroll.
    if (autoScrollKeyRef.current === chartMonthKey) return
    if (!chart.days.some((day) => day.iso === todayISO())) return

    autoScrollKeyRef.current = chartMonthKey
    scrollChartToToday(scrollRef.current, todayISO())
  }, [chart.days, chartMonthKey])

  return (
    <Card className="overflow-hidden p-5 animate-fade-slide">
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

      <div ref={scrollRef} className="thin-scrollbar h-44 overflow-x-auto pb-1 sm:h-56">
        <div className="relative flex h-full w-full items-end gap-1" style={trackStyle}>
          {totalAverageWorked > 0 && (
            <span
              className="pointer-events-none absolute inset-x-0 z-10 block border-t border-dashed border-primary/70"
              style={{ top: totalAverageTop }}
              title={`Média total ${minutesToHHMM(Math.round(totalAverageWorked))}`}
            />
          )}
          {chart.days.map((day) => {
            const workedHeight = `${Math.max(5, (day.worked / chartMaxMinutes) * 100)}%`
            const active = day.iso === selectedDate || day.iso === today
            return (
              <div
                key={day.iso}
                data-day-iso={day.iso}
                className={cn(
                  "group/homebar flex min-w-5 flex-1 flex-col items-center gap-1 rounded-md px-0.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-sm",
                  active && "bg-primary/10",
                )}
              >
                <div className="flex h-36 w-full items-end justify-center sm:h-48">
                  <span
                    className={cn(
                      "w-3 origin-bottom rounded-t transition-all duration-500 group-hover/homebar:scale-y-105",
                      chartBarClass(day),
                      active && "ring-2 ring-primary ring-offset-1 ring-offset-background",
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
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-positive" />
          Positivo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-negative" />
          Negativo
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Folga
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-chart-5" />
          Feriado
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-chart-6" />
          Em andamento
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-px w-3 border-t border-dashed border-primary/70" />
          Média total
        </span>
      </div>
    </Card>
  )
}

/**
 * Centraliza o dia atual no grafico horizontal quando o mes e aberto.
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
 * Define a cor da barra conforme status trabalhista e impacto no banco de horas.
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
 * Seleciona estilo do card de batida com base no tipo e no estado registrado.
 */
function punchCardClass({ tone, value, canPunch }) {
  if (value) {
    if (tone === "entry") return "border-positive bg-positive text-positive-foreground shadow-[0_12px_28px_rgba(88,168,122,0.18)] dark:shadow-none"
    if (tone === "exit") return "border-negative bg-negative text-negative-foreground shadow-[0_12px_28px_rgba(220,38,38,0.16)] dark:shadow-none"
    if (tone === "break") return "border-chart-3 bg-chart-3 text-primary-foreground shadow-[0_12px_28px_rgba(180,132,50,0.15)] dark:shadow-none"
    if (tone === "return") return "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(26,43,74,0.16)] dark:shadow-none"
    return "border-primary bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(26,43,74,0.16)] dark:shadow-none"
  }

  if (tone === "entry") return "border-positive/35 bg-positive/10 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
  if (tone === "exit") return "border-negative/35 bg-negative/10 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
  if (tone === "break") return "border-chart-3/35 bg-chart-3/10 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
  if (tone === "return") return "border-primary/30 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
  return "border-primary/30 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
}

/**
 * Seleciona estilo do icone da batida.
 */
function punchIconClass({ tone, value, canPunch }) {
  if (value) {
    return "bg-white/20 text-current"
  }

  if (tone === "entry") return "bg-positive/15 text-positive"
  if (tone === "exit") return "bg-negative/15 text-negative"
  if (tone === "break") return "bg-chart-3/15 text-chart-3"
  if (tone === "return") return "bg-primary/15 text-primary"
  return "bg-primary/15 text-primary"
}

/**
 * Retorna a cor textual associada ao tipo de batida.
 */
function punchTextClass(tone) {
  if (tone === "entry") return "text-positive"
  if (tone === "exit") return "text-negative"
  if (tone === "break") return "text-chart-3"
  if (tone === "return") return "text-primary"
  return "text-primary"
}

/**
 * Card compacto para totais do dia.
 */
function DaySummary({ label, value, tone = "default" }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-5">
      <span className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</span>
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
