const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

export function validateEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return "Informe seu e-mail."
  if (!EMAIL_RE.test(normalized)) return "Informe um e-mail valido."
  return null
}

export function getPasswordChecks(password) {
  const value = String(password || "")
  return [
    { key: "length", label: "8 caracteres ou mais", valid: value.length >= 8 },
    { key: "lower", label: "uma letra minuscula", valid: /[a-z]/.test(value) },
    { key: "upper", label: "uma letra maiuscula", valid: /[A-Z]/.test(value) },
    { key: "number", label: "um numero", valid: /\d/.test(value) },
    { key: "symbol", label: "um simbolo", valid: /[^A-Za-z0-9]/.test(value) },
  ]
}

export function validateStrongPassword(password) {
  const missing = getPasswordChecks(password).filter((check) => !check.valid)
  if (missing.length === 0) return null
  return `A senha precisa ter ${missing.map((check) => check.label).join(", ")}.`
}
