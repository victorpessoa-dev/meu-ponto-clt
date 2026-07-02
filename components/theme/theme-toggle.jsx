"use client"

/**
 * Controle visual para alternar entre tema claro e escuro.
 */
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"

/**
 * Renderiza o switch de tema evitando divergencia de hidratacao antes do mount.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div className="flex h-11 items-center gap-3 rounded-xl border border-border/80 bg-card px-3 text-primary shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden" aria-hidden="true">
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
      </span>
      <Switch
        size="default"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={isDark ? "Desativar modo escuro" : "Ativar modo escuro"}
        disabled={!mounted}
      />
    </div>
  )
}
