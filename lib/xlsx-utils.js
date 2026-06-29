const DATE_KEYS = ["data", "dia", "date"]
const ENTRY_KEYS = ["entrada", "entry", "entradatime"]
const BREAK_KEYS = ["pausa", "intervalo", "break", "breaktime"]
const RETURN_KEYS = ["retorno", "volta", "return", "returntime"]
const EXIT_KEYS = ["saida", "exit", "saidatime"]
const IMPORT_KEYS = [...DATE_KEYS, ...ENTRY_KEYS, ...BREAK_KEYS, ...RETURN_KEYS, ...EXIT_KEYS]

const MONTH_ALIASES = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
}

function normalizeKey(key) {
  return String(key)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

function buildNormalizedRow(row) {
  return new Map(Object.keys(row).map((key) => [normalizeKey(key), row[key]]))
}

function findValue(row, keys) {
  const normalized = buildNormalizedRow(row)
  for (const key of keys) {
    const value = normalized.get(normalizeKey(key))
    if (value !== undefined && value !== null && String(value).trim() !== "") return value
  }
  return ""
}

function rowHasImportData(row) {
  return IMPORT_KEYS.some((key) => String(findValue(row, [key]) ?? "").trim() !== "")
}

function isSummaryOrBlankRow(row) {
  const values = Object.values(row).map((value) => String(value ?? "").trim())
  if (values.every((value) => value === "")) return true
  return values.some((value) => ["total", "total:"].includes(normalizeKey(value)))
}

function excelSerialToISO(serial) {
  const utcDays = Math.floor(Number(serial) - 25569)
  const date = new Date(utcDays * 86400 * 1000)
  return date.toISOString().slice(0, 10)
}

function inferYearFromRows(rows) {
  for (const row of rows) {
    const value = findValue(row, DATE_KEYS)
    const text = String(value || "")
    const year = text.match(/\b(19\d{2}|20\d{2})\b/)
    if (year) return Number(year[1])
  }
  return new Date().getFullYear()
}

export function parseDateValue(value, defaultYear = new Date().getFullYear()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToISO(value)
  }

  const text = String(value || "").trim()
  if (!text) return null

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

  const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3]
    return `${year}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`
  }

  const namedMonth = text.match(/^(\d{1,2})[/-]([a-zA-Z\u00c0-\u017f.]{3,9})(?:[/-](\d{2,4}))?$/)
  if (namedMonth) {
    const monthKey = normalizeKey(namedMonth[2].replace(".", ""))
    const month = MONTH_ALIASES[monthKey]
    if (!month) return null

    const year = namedMonth[3]
      ? namedMonth[3].length === 2
        ? `20${namedMonth[3]}`
        : namedMonth[3]
      : String(defaultYear)

    return `${year}-${String(month).padStart(2, "0")}-${namedMonth[1].padStart(2, "0")}`
  }

  return null
}

export function parseTimeValue(value) {
  if (value === undefined || value === null || String(value).trim() === "") return ""

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const minutes = Math.round((value % 1) * 24 * 60) % (24 * 60)
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
  }

  const text = String(value).trim()
  const decimal = Number(text.replace(",", "."))
  if (Number.isFinite(decimal) && decimal >= 0 && decimal < 1) {
    return parseTimeValue(decimal)
  }

  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function hasAnyTime(record) {
  return !!(record.entry || record.breakTime || record.returnTime || record.exit)
}

export function rowsToRecords(rows, options = {}) {
  const records = []
  const errors = []
  const defaultYear = options.defaultYear || inferYearFromRows(rows)
  let started = false

  rows.forEach((row, index) => {
    const line = index + 2
    const date = parseDateValue(findValue(row, DATE_KEYS), defaultYear)

    if (!date) {
      if (started || isSummaryOrBlankRow(row) || !rowHasImportData(row)) return
      errors.push(`Linha ${line}: data invalida.`)
      return
    }

    started = true
    const record = {
      date,
      entry: parseTimeValue(findValue(row, ENTRY_KEYS)),
      breakTime: parseTimeValue(findValue(row, BREAK_KEYS)),
      returnTime: parseTimeValue(findValue(row, RETURN_KEYS)),
      exit: parseTimeValue(findValue(row, EXIT_KEYS)),
    }

    const invalidField = Object.entries(record).find(([key, value]) => key !== "date" && value === null)
    if (invalidField) {
      errors.push(`Linha ${line}: horario invalido.`)
      return
    }

    if (!hasAnyTime(record) && isSummaryOrBlankRow(row)) return
    records.push(record)
  })

  return { records, errors }
}

export function recordsToRows(records) {
  return records.map((record) => ({
    Data: record.date,
    Entrada: record.entry || "",
    Pausa: record.breakTime || "",
    Retorno: record.returnTime || "",
    Saida: record.exit || "",
  }))
}
