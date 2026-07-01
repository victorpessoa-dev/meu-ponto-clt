"use client"

import { useState } from "react"
import { CalendarDays, Clock, LogOut, Settings } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PunchView } from "@/components/punch-view"
import { ReportView } from "@/components/report-view"
import { SettingsView } from "@/components/settings-view"
import { UserAvatar } from "@/components/avatar-picker"

const TAB_THEMES = {
  ponto: {
    page: "bg-background",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-border/80 bg-card/92 backdrop-blur",
    active: "text-primary",
  },
  relatorio: {
    page: "bg-background",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-border/80 bg-card/92 backdrop-blur",
    active: "text-primary",
  },
  config: {
    page: "bg-background",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-border/80 bg-card/92 backdrop-blur",
    active: "text-primary",
  },
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState("ponto")
  const [reportCursor, setReportCursor] = useState(null)

  if (!user) return null
  const theme = TAB_THEMES[tab] || TAB_THEMES.ponto

  const navItems = [
    { key: "ponto", label: "Ponto", icon: Clock, show: true },
    { key: "relatorio", label: "Relatório", icon: CalendarDays, show: true },
    { key: "config", label: "Ajustes", icon: Settings, show: true },
  ]

  return (
    <div className={cn("flex min-h-dvh flex-col transition-colors duration-300", theme.page)}>
      <header className={cn("sticky top-0 z-20 border-b pt-safe transition-colors duration-300", theme.header)}>
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-safe py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <Clock className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <span className="truncate text-base font-bold tracking-tight">Meu Ponto CLT</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="touch-target flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground/12 text-sm font-semibold ring-1 ring-primary-foreground/20 transition-transform duration-200 hover:scale-105 hover:bg-primary-foreground/18"
                aria-label="Menu do usuário"
              >
                <UserAvatar avatarIcon={user.avatarIcon} name={user.name} className="h-8 w-8 bg-primary-foreground/15 text-primary-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="truncate">{user.name}</span>
                    <span className="truncate text-xs font-normal text-muted-foreground">
                      {[user.jobTitle, user.companyName].filter(Boolean).join(" • ") || user.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTab("config")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Meu perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-safe pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {tab === "ponto" && <PunchView />}
            {tab === "relatorio" && (
              <ReportView cursorOverride={reportCursor} onCursorOverrideApplied={() => setReportCursor(null)} />
            )}
            {tab === "config" && (
              <SettingsView
                onImportComplete={(summary) => {
                  if (summary?.latestDate) {
                    const [year, month] = summary.latestDate.split("-").map(Number)
                    setReportCursor({ year, month: month - 1 })
                  }
                  setTab("relatorio")
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className={cn("fixed inset-x-0 bottom-0 z-20 border-t pb-safe shadow-[0_-10px_30px_rgba(15,23,42,0.08)] transition-colors duration-300 dark:shadow-none", theme.nav)}>
        <div
          className="mx-auto grid w-full max-w-2xl px-safe"
          style={{ gridTemplateColumns: `repeat(${navItems.filter((n) => n.show).length}, 1fr)` }}
        >
          {navItems
            .filter((n) => n.show)
            .map(({ key, label, icon: Icon }) => {
              const active = tab === key
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "group/nav touch-target relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition-all duration-200 ease-out hover:bg-accent/60 hover:text-foreground sm:text-xs",
                    active ? theme.active : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                >
                  {active && <motion.span layoutId="active-nav-pill" className="absolute inset-x-3 inset-y-1 rounded-xl bg-accent/70" transition={{ duration: 0.2 }} />}
                  <Icon className="relative h-5 w-5 shrink-0 transition-transform duration-300 ease-out group-hover/nav:scale-105" strokeWidth={active ? 2.35 : 2} />
                  <span className="relative truncate">{label}</span>
                </button>
              )
            })}
        </div>
      </nav>
    </div>
  )
}
