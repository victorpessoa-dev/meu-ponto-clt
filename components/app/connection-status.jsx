"use client"

/**
 * Monitor de conectividade global.
 *
 * Mostra avisos discretos para offline, online e falhas de rede capturadas por fetch.
 */
import { useEffect, useRef } from "react"
import { toast } from "sonner"

/**
 * Identifica erros tipicos de rede em navegadores diferentes.
 */
function isNetworkError(error) {
  const message = String(error?.message || error || "").toLowerCase()
  return (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("load failed")
  )
}

/**
 * Componente sem UI que registra listeners globais de conectividade.
 */
export function ConnectionStatus() {
  const lastErrorToastRef = useRef(0)

  useEffect(() => {
    /**
     * Limita a frequencia dos toasts para uma falha de rede nao inundar a tela.
     */
    function notifyConnectionError() {
      const now = Date.now()
      if (now - lastErrorToastRef.current < 8000) return
      lastErrorToastRef.current = now
      toast.error("Erro de conexão. Verifique sua internet e tente novamente.")
    }

    /**
     * Informa perda de conexao detectada pelo navegador.
     */
    function handleOffline() {
      toast.error("Você está sem internet. Alguns recursos podem ficar indisponíveis.")
    }

    /**
     * Informa retorno de conexao detectado pelo navegador.
     */
    function handleOnline() {
      toast.success("Conexão restabelecida.")
    }

    /**
     * Captura promises rejeitadas por falhas de rede fora do wrapper de fetch.
     */
    function handleUnhandledRejection(event) {
      if (isNetworkError(event.reason)) notifyConnectionError()
    }

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args)
      } catch (error) {
        if (!navigator.onLine || isNetworkError(error)) notifyConnectionError()
        throw error
      }
    }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    if (navigator.onLine === false) handleOffline()

    return () => {
      window.fetch = originalFetch
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
