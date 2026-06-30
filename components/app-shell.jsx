"use client"

import { useState } from "react"
import { CalendarDays, Clock, LogOut, Settings, Users } from "lucide-react"
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
import { AdminView } from "@/components/admin-view"
import { UserAvatar } from "@/components/avatar-picker"

const TAB_THEMES = {
  ponto: {
    page: "bg-primary/5",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-primary/15 bg-white",
    active: "text-primary",
  },
  relatorio: {
    page: "bg-primary/5",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-primary/15 bg-white",
    active: "text-primary",
  },
  config: {
    page: "bg-primary/5",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-primary/15 bg-white",
    active: "text-primary",
  },
  admin: {
    page: "bg-primary/5",
    header: "border-primary/20 bg-primary text-primary-foreground",
    nav: "border-primary/15 bg-white",
    active: "text-primary",
  },
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState("ponto")
  const [reportCursor, setReportCursor] = useState(null)
  const [showIdentity, setShowIdentity] = useState(true)

  if (!user) return null
  const theme = TAB_THEMES[tab] || TAB_THEMES.ponto

  const navItems = [
    { key: "ponto", label: "Ponto", icon: Clock, show: true },
    { key: "relatorio", label: "Relatório", icon: CalendarDays, show: true },
    { key: "config", label: "Ajustes", icon: Settings, show: true },
    { key: "admin", label: "Usuários", icon: Users, show: user.isAdmin },
  ]

  return (
    <div className={cn("flex min-h-dvh flex-col transition-colors duration-300", theme.page)}>
      <header className={cn("sticky top-0 z-20 border-b pt-safe transition-colors duration-300", theme.header)}>
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-safe py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Clock className="h-5 w-5 shrink-0" strokeWidth={2.25} />
            <span className="truncate text-base font-bold tracking-tight">Meu Ponto CLT</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {showIdentity && (
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-semibold leading-tight">{user.name}</p>
                <p className="truncate text-xs leading-tight text-primary-foreground/75">
                  {[user.jobTitle, user.companyName].filter(Boolean).join(" • ") || user.email}
                </p>
              </div>
            )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="touch-target flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold ring-1 ring-primary-foreground/20 transition-transform duration-200 hover:scale-105"
              aria-label="Menu do usuário"
              onClick={() => setShowIdentity((current) => !current)}
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-safe pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pt-5">
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
        {tab === "admin" && user.isAdmin && <AdminView />}
      </main>

      <nav className={cn("fixed inset-x-0 bottom-0 z-20 border-t pb-safe shadow-[0_-6px_18px_rgba(15,23,42,0.06)] transition-colors duration-300", theme.nav)}>
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
                    "touch-target flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors sm:text-xs",
                    active ? theme.active : "text-muted-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span className="truncate">{label}</span>
                </button>
              )
            })}
        </div>
      </nav>
    </div>
  )
}
