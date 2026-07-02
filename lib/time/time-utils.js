/**
 * Utilitarios de data, hora e banco de horas.
 *
 * Concentra regras de calculo para que ponto, relatorio e graficos usem
 * os mesmos criterios de jornada, justificativa e saldo.
 */
/**
 * Converte um horario "HH:MM" em minutos desde 00:00.
 * Retorna null quando o valor esta vazio ou fora do formato valido.
 */
export function timeToMinutes(time) {
  if (!time) return null
  const [h, m] = time.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * Converte minutos totais em "H:MM".
 * Mantem o sinal negativo para saldos de banco de horas abaixo de zero.
 */
export function minutesToHHMM(total) {
  const sign = total < 0 ? "-" : ""
  const abs = Math.abs(total)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}:${String(m).padStart(2, "0")}`
}

/**
 * Retorna uma nova data com ajuste em segundos aplicado.
 */
export function addSeconds(date, seconds = 0) {
  const d = new Date(date)
  d.setSeconds(d.getSeconds() + seconds)
  return d
}

/**
 * Soma o ajuste de segundos ao relogio local e retorna a hora em "HH:MM".
 * Esse valor alimenta as batidas de ponto com o relogio configurado da empresa.
 */
export function currentTime(offsetSeconds = 0) {
  const now = addSeconds(new Date(), offsetSeconds)
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

/**
 * Soma o ajuste de segundos ao relogio local e retorna a hora completa em "HH:MM:SS".
 */
export function currentTimeWithSeconds(offsetSeconds = 0) {
  const now = addSeconds(new Date(), offsetSeconds)
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`
}

/**
 * Retorna a data local de hoje em "YYYY-MM-DD".
 * Usa o fuso do navegador para manter o dia igual ao que o usuario esta vendo.
 */
export function todayISO() {
  return toISODate(new Date())
}

/**
 * Formata uma data local como YYYY-MM-DD.
 */
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Interpreta uma data ISO como data local, evitando deslocamento por fuso horario.
 */
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

/**
 * Retorna o nome completo do dia da semana.
 */
export function weekdayName(iso) {
  return WEEKDAYS[parseISODate(iso).getDay()]
}

/**
 * Retorna o nome abreviado do dia da semana.
 */
export function weekdayShort(iso) {
  return WEEKDAYS_SHORT[parseISODate(iso).getDay()]
}

/**
 * Retorna o nome do mes pelo indice zero-based do JavaScript.
 */
export function monthName(monthIndex) {
  return MONTHS[monthIndex]
}

/**
 * Formata uma data ISO para "DD/mmm", usado em labels compactas de graficos e listas.
 */
export function shortDate(iso) {
  const d = parseISODate(iso)
  const day = String(d.getDate()).padStart(2, "0")
  return `${day}/${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}`
}

/**
 * Formata uma data ISO para uma descricao longa, como "Sexta, 20 de Junho".
 */
export function friendlyDate(iso) {
  const d = parseISODate(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

/**
 * Calcula os minutos trabalhados de um registro fechado.
 * Soma entrada ate saida e desconta o intervalo entre pausa e retorno quando os dois existem.
 */
export function workedMinutes(record) {
  if (!record) return 0
  const entry = timeToMinutes(record.entry)
  const exit = timeToMinutes(record.exit)
  const brk = timeToMinutes(record.breakTime)
  const ret = timeToMinutes(record.returnTime)

  if (entry == null) return 0

  // Sem saida o dia ainda esta aberto, entao nao entra no banco de horas definitivo.
  if (exit == null) return 0

  let total = exit - entry
  if (brk != null && ret != null && ret > brk) {
    total -= ret - brk
  }
  return total > 0 ? total : 0
}

/**
 * Calcula o tempo em andamento do dia atual.
 * Se o usuario pausou e ainda nao retornou, congela a contagem no horario da pausa.
 */
export function activeWorkedMinutes(record, currentTimeValue) {
  if (!record?.entry || record.exit) return workedMinutes(record)

  const entry = timeToMinutes(record.entry)
  const current = timeToMinutes(currentTimeValue)
  const breakStart = timeToMinutes(record.breakTime)
  const returnTime = timeToMinutes(record.returnTime)

  if (entry == null || current == null || current <= entry) return 0

  if (breakStart != null && returnTime == null) {
    return Math.max(0, breakStart - entry)
  }

  let total = current - entry
  if (breakStart != null && returnTime != null && returnTime > breakStart) {
    total -= returnTime - breakStart
  }

  return Math.max(0, total)
}

/**
 * Indica se existe qualquer batida registrada no dia.
 */
export function hasPunch(record) {
  return !!(record?.entry || record?.breakTime || record?.returnTime || record?.exit)
}

/**
 * Considera o dia fechado quando ha entrada e saida registradas.
 */
export function isRecordClosed(record) {
  return !!(record?.entry && record?.exit)
}

/**
 * Calcula quantos minutos de abono entram no dia.
 * O abono so vale quando existe horario inicial e final validos.
 */
export function abonoMinutes(justification) {
  if (justification?.type !== "abono") return 0

  const start = timeToMinutes(justification.startTime)
  const end = timeToMinutes(justification.endTime)
  if (start == null || end == null || end <= start) return 0

  return end - start
}

/**
 * Busca a jornada esperada do dia usando o indice da semana da data informada.
 */
export function expectedMinutes(iso, schedule) {
  const dow = parseISODate(iso).getDay()
  return schedule[dow] ?? 0
}

/**
 * Calcula o resultado do banco para um dia.
 * Dias de ferias, feriado, folga, atestado e justificativa nao entram no banco; falta e abono ajustam o saldo conforme a jornada esperada.
 */
export function bankMetrics(iso, record, schedule, justification) {
  const expected = expectedMinutes(iso, schedule)
  const worked = workedMinutes(record)
  const hasAnyPunch = hasPunch(record)
  const closed = isRecordClosed(record)
  const abono = Math.min(expected, abonoMinutes(justification))

  if (
    justification?.type === "ferias" ||
    justification?.type === "feriado" ||
    justification?.type === "folga" ||
    justification?.type === "atestado" ||
    justification?.type === "justificada"
  ) {
    return {
      expected,
      worked,
      hasPunch: hasAnyPunch,
      closed,
      bankable: false,
      balance: null,
      abono: 0,
    }
  }

  if (justification?.type === "falta") {
    return {
      expected,
      worked,
      hasPunch: hasAnyPunch,
      closed,
      bankable: expected > 0,
      balance: expected > 0 ? worked - expected : null,
      abono: 0,
    }
  }

  if (justification?.type === "abono" && abono > 0) {
    return {
      expected,
      worked,
      hasPunch: hasAnyPunch,
      closed,
      bankable: expected > 0 || hasAnyPunch,
      balance: worked - Math.max(0, expected - abono),
      abono,
    }
  }

  if (!closed) {
    return {
      expected,
      worked,
      hasPunch: hasAnyPunch,
      closed,
      bankable: false,
      balance: null,
      abono,
    }
  }

  const balance = worked - Math.max(0, expected - abono)

  return {
    expected,
    worked,
    hasPunch: hasAnyPunch,
    closed,
    bankable: true,
    balance,
    abono,
  }
}

/**
 * Agrupa dias consecutivos com a mesma carga horaria e gera um resumo legivel da jornada semanal.
 * Exemplo: "seg-sex 8h, sab 4h".
 */
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
