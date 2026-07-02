"use client"

/**
 * Registro client-side do Service Worker.
 *
 * Mantem a PWA opcional: se o registro falhar, a aplicacao continua funcionando online.
 */
import { useEffect } from "react"

/**
 * Registra o Service Worker apenas em producao e apos o carregamento da pagina.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // silencioso: PWA opcional
        })
      }
      window.addEventListener("load", onLoad)
      return () => window.removeEventListener("load", onLoad)
    }
  }, [])
  return null
}
