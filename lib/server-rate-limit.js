const buckets = new Map()

/**
 * Conta tentativas por chave dentro de uma janela de tempo.
 * Quando o limite estoura, retorna quanto falta para liberar uma nova tentativa.
 */
export function checkRateLimit(key, { max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs })
    return { limited: false, remaining: max - 1, resetSeconds: Math.ceil(windowMs / 1000) }
  }

  if (current.count >= max) {
    return {
      limited: true,
      remaining: 0,
      resetSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
    }
  }

  current.count += 1
  buckets.set(key, current)

  return {
    limited: false,
    remaining: Math.max(0, max - current.count),
    resetSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
  }
}

/**
 * Combina finalidade, IP e e-mail para limitar tentativas sem misturar fluxos diferentes.
 */
export function requestKey(request, purpose, email = "") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const ip = forwarded || request.headers.get("x-real-ip") || "local"
  return `${purpose}:${ip}:${String(email).toLowerCase()}`
}
