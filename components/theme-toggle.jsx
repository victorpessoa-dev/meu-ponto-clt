"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
      aria-pressed={isDark}
      aria-label={isDark ? "Desativar modo escuro" : "Ativar modo escuro"}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-card text-primary shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:border-primary/40 hover:bg-accent/45 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ opacity: 0, rotate: -45, scale: 0.75 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.75 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="absolute"
        >
          {isDark ? <Moon className="h-5 w-5" strokeWidth={2.25} /> : <Sun className="h-5 w-5" strokeWidth={2.25} />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
