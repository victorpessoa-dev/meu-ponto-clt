/**
 * Utilitarios de validacao de credenciais compartilhados entre cliente e servidor.
 *
 * Mantem as mesmas regras de e-mail e senha em cadastro, login e redefinicao.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Normaliza e-mails antes de validacao ou envio ao Supabase.
 */
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

/**
 * Valida presenca e formato basico de e-mail.
 */
export function validateEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return "Informe seu e-mail."
  if (!EMAIL_RE.test(normalized)) return "Informe um e-mail valido."
  return null
}

/**
 * Retorna os criterios de senha forte com estado individual para a interface.
 */
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

/**
 * Consolida os criterios de senha forte em uma mensagem unica de erro.
 */
export function validateStrongPassword(password) {
  const missing = getPasswordChecks(password).filter((check) => !check.valid)
  if (missing.length === 0) return null
  return `A senha precisa ter ${missing.map((check) => check.label).join(", ")}.`
}
