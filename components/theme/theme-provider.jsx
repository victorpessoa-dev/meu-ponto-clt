"use client"

/**
 * Provider de tema da aplicacao.
 *
 * Usa classe no elemento raiz para integrar next-themes com Tailwind.
 */
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Configura tema claro/escuro sem seguir automaticamente o sistema operacional.
 */
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
