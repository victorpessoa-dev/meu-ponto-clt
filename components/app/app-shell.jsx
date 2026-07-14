"use client"

/**
 * Shell autenticado da aplicacao.
 *
 * Mantem a navegacao compacta no mobile e oferece uma area de trabalho
 * persistente, no estilo desktop, em telas maiores.
 */
import { useState } from "react"
import { CalendarDays, ChevronDown, Clock3, LogOut, Settings } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "@/lib/auth/auth-context"
import { updateUser } from "@/lib/data/store"
import { cn } from "@/lib/utils/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PunchView } from "@/components/ponto/punch-view"
import { ReportView } from "@/components/reports/report-view"
import { SettingsView } from "@/components/settings/settings-view"
import { UserAvatar } from "@/components/settings/avatar-picker"
import { OnboardingProvider } from "@/components/onboarding/onboarding"

const NAV_ITEMS = [
  { key: "ponto", label: "Ponto", description: "Registro diário", icon: Clock3 },
  { key: "relatorio", label: "Relatório", description: "Espelho e banco de horas", icon: CalendarDays },
  { key: "config", label: "Configurações", description: "Preferências e dados", icon: Settings },
]

const PAGE_META = {
  ponto: { eyebrow: "Operação", title: "Registro de ponto", description: "Acompanhe sua jornada e registre os horários do dia." },
  relatorio: { eyebrow: "Monitoramento", title: "Relatório mensal", description: "Consulte registros, saldos e ocorrências do período." },
  config: { eyebrow: "Gerenciamento", title: "Configurações", description: "Gerencie seu perfil, jornada e dados da conta." },
}

export function AppShell() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState("ponto")
  const [reportCursor, setReportCursor] = useState(null)
  const [settingsSection, setSettingsSection] = useState("perfil")

  if (!user) return null
  const page = PAGE_META[tab] || PAGE_META.ponto

  const userMenu = (compact = false) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-tour-id="user-menu"
        className={cn(
          "group flex items-center rounded-xl text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/30",
          compact ? "size-10 justify-center" : "w-full gap-2.5 p-2",
        )}
        aria-label="Menu do usuário"
      >
        <UserAvatar avatarIcon={user.avatarIcon} name={user.name} className="size-8 shrink-0" />
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.jobTitle || user.email}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-data-[popup-open]:rotate-180" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "right"} className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2">
            <span className="truncate text-sm text-foreground">{user.name}</span>
            <span className="truncate font-normal">{[user.jobTitle, user.companyName].filter(Boolean).join(" • ") || user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTab("config")}><Settings />Meu perfil</DropdownMenuItem>
        <DropdownMenuItem onClick={logout} variant="destructive"><LogOut />Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <OnboardingProvider
      userId={user.id}
      onboardingState={user.onboardingState}
      onOnboardingStateChange={(nextState) => updateUser(user.id, { onboardingState: nextState })}
      activeArea={tab}
      onSelectArea={setTab}
      settingsSection={settingsSection}
      onSelectSettingsSection={setSettingsSection}
    >
      <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4" data-tour-id="app-brand">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"><Clock3 className="size-4.5" strokeWidth={2.3} /></span>
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground">Meu Ponto CLT</span>
          </div>

          <nav className="flex-1 space-y-1 p-3" aria-label="Navegação principal">
            <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Workspace</p>
            {NAV_ITEMS.map(({ key, label, description, icon: Icon }) => {
              const active = tab === key
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/30",
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/65 hover:text-sidebar-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                  data-tour-id={`nav-${key}`}
                >
                  {active && <motion.span layoutId="desktop-active" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" />}
                  <Icon className={cn("size-4.5 shrink-0", active && "text-sidebar-primary")} strokeWidth={active ? 2.25 : 1.9} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
          <div className="border-t border-sidebar-border p-3">{userMenu()}</div>
        </aside>

        <div className="min-w-0 lg:col-start-2">
          <header className="sticky top-0 z-20 border-b border-border/75 bg-background/88 pt-safe backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-safe lg:h-16 lg:px-8">
              <div className="flex min-w-0 items-center gap-2 lg:hidden" data-tour-id="app-brand">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Clock3 className="size-4.5" /></span>
                <span className="truncate text-sm font-bold tracking-tight">Meu Ponto CLT</span>
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{page.eyebrow}</p>
                <h1 className="truncate text-base font-semibold tracking-tight">{page.title}</h1>
              </div>
              <div className="lg:hidden">{userMenu(true)}</div>
              <p className="hidden max-w-md truncate text-sm text-muted-foreground xl:block">{page.description}</p>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl px-safe pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:pt-6 lg:px-8 lg:pb-10 lg:pt-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div className={cn(tab === "ponto" && "mx-auto max-w-4xl", tab === "config" && "mx-auto max-w-5xl")} key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }}>
                {tab === "ponto" && <PunchView />}
                {tab === "relatorio" && <ReportView cursorOverride={reportCursor} onCursorOverrideApplied={() => setReportCursor(null)} />}
                {tab === "config" && (
                  <SettingsView value={settingsSection} onValueChange={setSettingsSection} onImportComplete={(summary) => {
                    if (summary?.latestDate) {
                      const [year, month] = summary.latestDate.split("-").map(Number)
                      setReportCursor({ year, month: month - 1 })
                    }
                    setTab("relatorio")
                  }} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-card/92 pb-safe shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden" aria-label="Navegação principal">
          <div className="mx-auto grid max-w-lg grid-cols-3 px-safe py-1">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
              const active = tab === key
              return (
                <button key={key} onClick={() => setTab(key)} className={cn("relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors", active ? "text-primary" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")} aria-current={active ? "page" : undefined} data-tour-id={`nav-${key}`}>
                  {active && <motion.span layoutId="mobile-active" className="absolute inset-x-2 inset-y-1 rounded-lg bg-accent/75" />}
                  <Icon className="relative size-4.5" strokeWidth={active ? 2.3 : 1.9} />
                  <span className="relative">{label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </OnboardingProvider>
  )
}
