import assert from "node:assert/strict"
import {
  abonoMinutes,
  activeWorkedMinutes,
  bankMetrics,
  expectedMinutes,
  minutesToHHMM,
  timeToMinutes,
  workedMinutes,
} from "../lib/time/time-utils.js"
import { getPasswordChecks, normalizeEmail, validateEmail, validateStrongPassword } from "../lib/auth/security-utils.js"

const tests = []

function test(name, fn) {
  tests.push({ name, fn })
}

test("timeToMinutes converte horarios HH:MM para minutos desde meia-noite", () => {
  assert.equal(timeToMinutes("00:00"), 0)
  assert.equal(timeToMinutes("08:30"), 510)
  assert.equal(timeToMinutes("23:59"), 1439)
})

test("timeToMinutes recusa horarios vazios, incompletos ou fora do intervalo valido", () => {
  assert.equal(timeToMinutes(""), null)
  assert.equal(timeToMinutes(null), null)
  assert.equal(timeToMinutes("24:00"), null)
  assert.equal(timeToMinutes("12:60"), null)
  assert.equal(timeToMinutes("abc"), null)
})

test("minutesToHHMM formata minutos positivos e negativos", () => {
  assert.equal(minutesToHHMM(0), "0:00")
  assert.equal(minutesToHHMM(67), "1:07")
  assert.equal(minutesToHHMM(-95), "-1:35")
})

test("workedMinutes desconta pausa e retorno", () => {
  const record = {
    entry: "08:00",
    breakTime: "12:00",
    returnTime: "13:00",
    exit: "17:30",
  }

  assert.equal(workedMinutes(record), 510)
})

test("workedMinutes nao calcula banco definitivo sem saida", () => {
  assert.equal(workedMinutes({ entry: "08:00", breakTime: null, returnTime: null, exit: null }), 0)
})

test("activeWorkedMinutes calcula andamento e congela durante pausa aberta", () => {
  assert.equal(activeWorkedMinutes({ entry: "08:00" }, "10:15"), 135)
  assert.equal(activeWorkedMinutes({ entry: "08:00", breakTime: "12:00" }, "14:00"), 240)
  assert.equal(activeWorkedMinutes({ entry: "08:00", breakTime: "12:00", returnTime: "13:00" }, "15:30"), 390)
})

test("abonoMinutes calcula abono apenas com horario inicial e final validos", () => {
  assert.equal(abonoMinutes({ type: "abono", startTime: "09:00", endTime: "11:30" }), 150)
  assert.equal(abonoMinutes({ type: "abono", startTime: "11:30", endTime: "09:00" }), 0)
  assert.equal(abonoMinutes({ type: "folga", startTime: "09:00", endTime: "11:30" }), 0)
})

test("expectedMinutes usa o dia da semana para encontrar a jornada", () => {
  const schedule = [0, 480, 480, 480, 480, 480, 240]

  assert.equal(expectedMinutes("2026-06-28", schedule), 0)
  assert.equal(expectedMinutes("2026-06-29", schedule), 480)
  assert.equal(expectedMinutes("2026-07-04", schedule), 240)
})

test("bankMetrics calcula saldo positivo, negativo e dia aberto", () => {
  const schedule = [0, 480, 480, 480, 480, 480, 240]
  const positive = bankMetrics(
    "2026-06-29",
    { entry: "08:00", breakTime: "12:00", returnTime: "13:00", exit: "18:00" },
    schedule,
  )
  const negative = bankMetrics("2026-06-29", { entry: "08:00", exit: "15:00" }, schedule)
  const open = bankMetrics("2026-06-29", { entry: "08:00" }, schedule)

  assert.equal(positive.bankable, true)
  assert.equal(positive.balance, 60)
  assert.equal(negative.balance, -60)
  assert.equal(open.bankable, false)
  assert.equal(open.balance, null)
})

test("bankMetrics remove folga, ferias e feriado do banco", () => {
  const schedule = [0, 480, 480, 480, 480, 480, 240]

  for (const type of ["folga", "ferias", "feriado", "atestado", "justificada"]) {
    const metrics = bankMetrics("2026-06-29", null, schedule, { type })
    assert.equal(metrics.bankable, false)
    assert.equal(metrics.balance, null)
  }
})

test("bankMetrics reduz carga esperada com abono", () => {
  const schedule = [0, 480, 480, 480, 480, 480, 240]
  const metrics = bankMetrics(
    "2026-06-29",
    { entry: "08:00", breakTime: "12:00", returnTime: "13:00", exit: "16:00" },
    schedule,
    { type: "abono", startTime: "16:00", endTime: "17:00" },
  )

  assert.equal(metrics.abono, 60)
  assert.equal(metrics.balance, 0)
})

test("normalizeEmail remove espacos e deixa em minusculo", () => {
  assert.equal(normalizeEmail("  Usuario@Empresa.COM  "), "usuario@empresa.com")
  assert.equal(normalizeEmail(null), "")
})

test("validateEmail valida obrigatoriedade e formato", () => {
  assert.equal(validateEmail(""), "Informe seu e-mail.")
  assert.equal(validateEmail("usuario"), "Informe um e-mail valido.")
  assert.equal(validateEmail("usuario@empresa.com"), null)
})

test("getPasswordChecks identifica requisitos de senha forte", () => {
  const checks = Object.fromEntries(getPasswordChecks("Senha@123").map((check) => [check.key, check.valid]))

  assert.deepEqual(checks, {
    length: true,
    lower: true,
    upper: true,
    number: true,
    symbol: true,
  })
})

test("validateStrongPassword recusa senha fraca e aceita senha forte", () => {
  assert.match(validateStrongPassword("fraca"), /8 caracteres/)
  assert.equal(validateStrongPassword("Senha@123"), null)
})

let passed = 0

for (const { name, fn } of tests) {
  try {
    fn()
    passed += 1
    console.log(`ok ${passed} - ${name}`)
  } catch (error) {
    console.error(`not ok ${passed + 1} - ${name}`)
    console.error(error)
    process.exitCode = 1
    break
  }
}

if (!process.exitCode) {
  console.log(`\n${passed}/${tests.length} tests passed`)
}
