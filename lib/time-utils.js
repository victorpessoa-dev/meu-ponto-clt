// "HH:MM" -> minutos desde 00:00
export function timeToMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// minutos -> "H:MM" (pode ser negativo)
export function minutesToHHMM(total) {
  const sign = total < 0 ? "-" : ""
  const abs = Math.abs(total)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}:${String(m).padStart(2, "0")}`
}

// hora atual no formato HH:MM
export function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

// data de hoje YYYY-MM-DD (local)
export function todayISO() {
  return toISODate(new Date())
}

export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

export function weekdayName(iso) {
  return WEEKDAYS[parseISODate(iso).getDay()]
}

export function weekdayShort(iso) {
  return WEEKDAYS_SHORT[parseISODate(iso).getDay()]
}

export function monthName(monthIndex) {
  return MONTHS[monthIndex]
}

// "01/jun"
export function shortDate(iso) {
  const d = parseISODate(iso)
  const day = String(d.getDate()).padStart(2, "0")
  return `${day}/${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}`
}

// data legível: "Sexta-feira, 20 de junho"
export function friendlyDate(iso) {
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

// minutos trabalhados em um registro
export function workedMinutes(record) {
  if (!record) return 0
  const entry = timeToMinutes(record.entry)
  const exit = timeToMinutes(record.exit)
  const brk = timeToMinutes(record.breakTime)
  const ret = timeToMinutes(record.returnTime)

  if (entry == null) return 0

  // se não bateu saída ainda, não computa
  if (exit == null) return 0

  let total = exit - entry
  if (brk != null && ret != null && ret > brk) {
    total -= ret - brk
  }
  return total > 0 ? total : 0
}

// jornada esperada do dia conforme schedule do usuário
export function expectedMinutes(iso, schedule) {
  const dow = parseISODate(iso).getDay()
  return schedule[dow] ?? 0
}

/** Resumo legível da jornada semanal (ex.: "seg-sex 8h, sáb 4h") */
export function scheduleSummary(schedule) {
  const labels = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
  const parts = []
  let i = 0
  while (i < 7) {
    const mins = schedule[i] ?? 0
    if (mins === 0) {
      i++
      continue
    }
    const hours = mins / 60
    const hLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1).replace(".", ",")}h`
    let j = i + 1
    while (j < 7 && schedule[j] === mins) j++
    const from = labels[i]
    const to = labels[j - 1]
    parts.push(j - i > 1 ? `${from}-${to} ${hLabel}` : `${from} ${hLabel}`)
    i = j
  }
  return parts.length ? parts.join(", ") : "sem jornada definida"
}
