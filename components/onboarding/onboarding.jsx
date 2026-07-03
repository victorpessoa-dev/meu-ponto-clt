"use client"

/**
 * Onboarding interativo do app autenticado.
 *
 * Mantem a configuracao do tour em um unico lugar e usa data-tour-id nas telas
 * para destacar elementos sem acoplar regras de negocio ao guia.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { driver } from "driver.js"
import { Cog, HelpCircle, Keyboard, LifeBuoy, Lightbulb, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils/utils"

const STORAGE_PREFIX = "meu-ponto-clt:onboarding"
const ONBOARDING_NOT_STARTED = 0
const ONBOARDING_COMPLETED = 1
const ONBOARDING_SKIPPED = 2
const OnboardingContext = createContext(null)
const CHEVRON_LEFT_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
const CHEVRON_RIGHT_ICON = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'

// Os selectors abaixo apontam para marcadores data-tour-id deixados nas telas apenas como ancoras do tour.
export const ONBOARDING_STEPS = [
  {
    id: "brand",
    area: "ponto",
    selector: "app-brand",
    title: "Bem-vindo ao Meu Ponto CLT",
    description:
      "Este app centraliza suas batidas de ponto, banco de horas, justificativas, relatórios e configurações de jornada em uma rotina simples.",
    example: "Exemplo: para começar um dia comum, acompanhe primeiro o relógio da empresa e depois use os cartões de batida.",
    placement: "bottom",
  },
  {
    id: "day-picker",
    area: "ponto",
    selector: "ponto-day-picker",
    title: "Escolha o dia de referência",
    description:
      "Use as setas para consultar dias anteriores. O app bloqueia batidas em datas futuras e facilita voltar para hoje.",
    example: "Exemplo: para conferir uma saída de ontem, volte um dia e revise os horários sem alterar nada automaticamente.",
    placement: "bottom",
  },
  {
    id: "company-clock",
    area: "ponto",
    selector: "ponto-company-clock",
    title: "Relógio da empresa",
    description:
      "Este horário é a referência usada para registrar entrada, pausa, retorno e saída. Configurações finas ficam na área de Configurações.",
    example: "Exemplo: quando o relógio oficial da empresa estiver 2 minutos adiantado, ajuste essa diferença no perfil.",
    placement: "bottom",
  },
  {
    id: "punch-actions",
    area: "ponto",
    selector: "ponto-punch-actions",
    title: "Bata o ponto na ordem correta",
    description:
      "Os cartões mostram as batidas permitidas para o dia. O app orienta quando você tenta registrar algo fora da sequência.",
    example: "Exemplo: a sequência normal é Entrada, Pausa, Retorno e Saída; o tour apenas mostra o fluxo, sem criar dados.",
    placement: "top",
  },
  {
    id: "month-overview",
    area: "ponto",
    selector: "ponto-month-overview",
    title: "Resumo visual do mês",
    description:
      "As barras mostram dias positivos, negativos, folgas, feriados e jornadas em andamento para você perceber tendências rapidamente.",
    example: "Exemplo: uma barra vermelha sinaliza saldo negativo, enquanto uma barra verde indica saldo positivo.",
    placement: "top",
  },
  {
    id: "report-filters",
    area: "relatorio",
    selector: "relatorio-filters",
    title: "Navegue por mês e ano",
    description:
      "No Relatório, escolha o período desejado para revisar totais, gráficos e a planilha mensal de horas.",
    example: "Exemplo: para fechar março de 2026, selecione o mês e o ano antes de revisar os totais.",
    placement: "bottom",
  },
  {
    id: "report-sheet",
    area: "relatorio",
    selector: "relatorio-sheet",
    title: "Planilha editável",
    description:
      "Clique em uma linha para ajustar entrada, pausa, retorno ou saída quando precisar corrigir um registro.",
    example: "Exemplo: para corrigir uma saída, abra o dia na planilha, revise os horários e salve o ajuste.",
    placement: "top",
  },
  {
    id: "settings-profile",
    area: "config",
    settingsSection: "perfil",
    selector: "settings-profile-options",
    title: "Perfil, jornada e aparência",
    description:
      "Aqui ficam dados profissionais, login, avatar, dias de trabalho, carga horária e o ajuste do relógio da empresa.",
    example: "Exemplo: para uma rotina padrão, defina 8 horas de segunda a sexta e deixe o fim de semana como folga.",
    placement: "bottom",
  },
  {
    id: "settings-justify",
    area: "config",
    settingsSection: "justificar",
    selector: "settings-justify-form",
    title: "Justifique ausências",
    description:
      "Registre folga, férias, feriado, falta, abono, atestado ou justificativa para o banco de horas calcular corretamente.",
    example: "Exemplo: para informar um atestado, escolha a data, selecione o tipo e descreva o motivo quando fizer sentido.",
    placement: "bottom",
  },
  {
    id: "settings-spreadsheet",
    area: "config",
    settingsSection: "planilha",
    selector: "settings-spreadsheet-tools",
    title: "Importe e exporte planilhas",
    description:
      "Baixe um modelo, importe arquivos XLSX e exporte seus registros. Colunas de cálculo são ignoradas na importação.",
    example: "Exemplo: para importar dados, use uma planilha com as colunas Data, Entrada, Pausa, Retorno e Saída.",
    placement: "top",
  },
  {
    id: "help",
    area: "config",
    settingsSection: "perfil",
    selector: "onboarding-help",
    title: "Reabra este guia quando quiser",
    description:
      "O card Primeiros passos guarda FAQ, atalhos, glossário e o botão para reiniciar o tour a qualquer momento.",
    example: "Exemplo: quando surgir dúvida sobre planilhas, abra este card e reinicie o tour ou consulte o FAQ.",
    placement: "bottom",
  },
]

export function OnboardingProvider({
  userId,
  onboardingState = ONBOARDING_NOT_STARTED,
  onOnboardingStateChange,
  activeArea,
  onSelectArea,
  settingsSection,
  onSelectSettingsSection,
  children,
}) {
  const storageKey = `${STORAGE_PREFIX}:${userId || "anon"}`
  const [status, setStatus] = useState("loading")
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const driverRef = useRef(null)
  const destroyStatusRef = useRef("skipped")

  const currentStep = ONBOARDING_STEPS[stepIndex]

  useEffect(() => {
    try {
      // A decisao do usuario vem do perfil; localStorage fica apenas como fallback para ambientes sem a coluna nova.
      const saved = window.localStorage.getItem(storageKey)
      const savedState = saved === "completed" ? ONBOARDING_COMPLETED : saved === "skipped" ? ONBOARDING_SKIPPED : ONBOARDING_NOT_STARTED
      const profileState = [ONBOARDING_NOT_STARTED, ONBOARDING_COMPLETED, ONBOARDING_SKIPPED].includes(Number(onboardingState))
        ? Number(onboardingState)
        : ONBOARDING_NOT_STARTED
      const effectiveState = profileState || savedState
      setStatus(effectiveState)
      setWelcomeOpen(effectiveState === ONBOARDING_NOT_STARTED)
    } catch {
      setStatus(onboardingState)
      setWelcomeOpen(Number(onboardingState) === ONBOARDING_NOT_STARTED)
    }
  }, [onboardingState, storageKey])

  const persistStatus = useCallback(
    async (nextState) => {
      const normalizedState = [ONBOARDING_COMPLETED, ONBOARDING_SKIPPED].includes(Number(nextState))
        ? Number(nextState)
        : ONBOARDING_SKIPPED
      setStatus(normalizedState)
      try {
        window.localStorage.setItem(storageKey, normalizedState === ONBOARDING_COMPLETED ? "completed" : "skipped")
      } catch {
        // Cache local opcional; a fonte de verdade e a coluna users.onboarding_state.
      }
      await onOnboardingStateChange?.(normalizedState)
    },
    [onOnboardingStateChange, storageKey],
  )

  const prepareStep = useCallback(
    (index, instance = driverRef.current) => {
      const nextIndex = Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1))
      const step = ONBOARDING_STEPS[nextIndex]
      setStepIndex(nextIndex)
      onSelectArea?.(step.area)
      if (step.settingsSection) onSelectSettingsSection?.(step.settingsSection)
      window.setTimeout(() => {
        instance?.moveTo(nextIndex)
        instance?.refresh()
      }, 360)
    },
    [onSelectArea, onSelectSettingsSection],
  )

  const buildDriverSteps = useCallback(() => {
    return ONBOARDING_STEPS.map((step) => ({
      element: () => document.querySelector(`[data-tour-id="${step.selector}"]`) || document.body,
      popover: {
        title: step.title,
        description: `${step.description}<br><br><span class="driver-tour-example">${step.example}</span>`,
        side: step.placement === "top" ? "top" : "bottom",
        align: "center",
      },
      onHighlightStarted: () => {
        onSelectArea?.(step.area)
        if (step.settingsSection) onSelectSettingsSection?.(step.settingsSection)
      },
    }))
  }, [onSelectArea, onSelectSettingsSection])

  const closeTour = useCallback(
    (nextState = ONBOARDING_SKIPPED) => {
      destroyStatusRef.current = nextState
      setRunning(false)
      persistStatus(nextState)
      if (driverRef.current?.isActive()) driverRef.current.destroy()
    },
    [persistStatus],
  )

  const startTour = useCallback(
    (index = 0) => {
      setWelcomeOpen(false)
      setHelpOpen(false)
      setRunning(true)
      destroyStatusRef.current = ONBOARDING_SKIPPED
      const isDarkMode = document.documentElement.classList.contains("dark") || document.body.classList.contains("dark")

      const instance = driver({
        steps: buildDriverSteps(),
        animate: true,
        smoothScroll: true,
        allowClose: true,
        allowKeyboardControl: true,
        disableActiveInteraction: true,
        overlayOpacity: 0.58,
        stagePadding: 10,
        stageRadius: 16,
        popoverClass: cn("driver-popover-app", isDarkMode && "driver-popover-dark"),
        showProgress: true,
        progressText: "Etapa {{current}} de {{total}}",
        nextBtnText: "→",
        prevBtnText: "←",
        doneBtnText: "✓",
        showButtons: ["previous", "next", "close"],
        onPopoverRender: (popover, opts) => {
          popover.previousButton.innerHTML = CHEVRON_LEFT_ICON
          popover.previousButton.setAttribute("aria-label", "Etapa anterior")
          popover.nextButton.innerHTML = opts.driver.isLastStep() ? "✓" : CHEVRON_RIGHT_ICON
          popover.nextButton.setAttribute("aria-label", opts.driver.isLastStep() ? "Concluir tour" : "Próxima etapa")
        },
        onNextClick: (_element, _step, opts) => {
          const activeIndex = opts.driver.getActiveIndex() ?? 0
          if (!opts.driver.hasNextStep()) {
            closeTour(ONBOARDING_COMPLETED)
            return
          }
          prepareStep(activeIndex + 1, opts.driver)
        },
        onPrevClick: (_element, _step, opts) => {
          const activeIndex = opts.driver.getActiveIndex() ?? 0
          prepareStep(activeIndex - 1, opts.driver)
        },
        onCloseClick: () => closeTour(ONBOARDING_SKIPPED),
        onDoneClick: () => closeTour(ONBOARDING_COMPLETED),
        onDestroyed: () => {
          setRunning(false)
          persistStatus(destroyStatusRef.current)
        },
      })

      driverRef.current = instance
      prepareStep(index, instance)
      window.setTimeout(() => instance.drive(index), 380)
    },
    [buildDriverSteps, closeTour, persistStatus, prepareStep],
  )

  useEffect(() => {
    if (!running || !currentStep) return
    window.setTimeout(() => driverRef.current?.refresh(), 280)
  }, [activeArea, currentStep, running, settingsSection])

  useEffect(() => {
    const onResize = () => driverRef.current?.refresh()
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
    }
  }, [])

  useEffect(() => () => driverRef.current?.destroy(), [])

  const value = useMemo(
    () => ({
      status,
      openHelp: () => setHelpOpen(true),
      startTour,
    }),
    [startTour, status],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      <WelcomeDialog open={welcomeOpen && status !== "loading"} onStart={() => startTour(0)} onSkip={() => {
        setWelcomeOpen(false)
        persistStatus(ONBOARDING_SKIPPED)
      }} />
      <HelpCenter open={helpOpen} onOpenChange={setHelpOpen} onStartTour={() => startTour(0)} />
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) throw new Error("useOnboarding deve ser usado dentro de OnboardingProvider.")
  return context
}

function OnboardingHelpCardLegacy({ className }) {
  const { openHelp } = useOnboarding()

  return (
    <button
      type="button"
      onClick={openHelp}
      className={cn(
        "group/help flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-card/75 p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/35 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35",
        className,
      )}
      aria-label="Abrir Primeiros passos e FAQ"
      data-tour-id="onboarding-help"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <HelpCircle className="h-5 w-5 transition-transform duration-300 ease-out group-hover/help:scale-105" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-primary">Primeiros passos</span>
        <span className="block truncate text-xs leading-5 text-muted-foreground">Tour guiado, FAQ, atalhos e glossário.</span>
      </span>
    </button>
  )
}

export function OnboardingHelpCard({ className }) {
  const { openHelp } = useOnboarding()

  return (
    <div
      className={cn("group rounded-2xl border border-border/80 bg-card/70 p-4 transition-all duration-200 ease-out hover:border-primary/30 hover:bg-accent/35", className)}
      data-tour-id="onboarding-help"
    >
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-accent/45 text-primary">
          <HelpCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">Primeiros passos</p>
          <p className="truncate text-xs leading-5 text-muted-foreground">Tour guiado, FAQ, atalhos e glossário.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 border-border/80 bg-card text-primary transition-all duration-200 ease-out hover:border-primary/40 hover:bg-accent/45 hover:text-primary"
          onClick={openHelp}
          aria-label="Abrir Primeiros passos e FAQ"
        >
          <Cog className="h-5 w-5 transition-transform duration-300 ease-out group-hover:rotate-45" />
        </Button>
      </div>
    </div>
  )
}

export function ContextualTip({ children, className }) {
  return (
    <div className={cn("flex gap-2 rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-xs leading-5 text-muted-foreground", className)}>
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

function WelcomeDialog({ open, onStart, onSkip }) {
  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bem-vindo ao Meu Ponto CLT</DialogTitle>
          <DialogDescription>
            Em poucos passos você aprende a registrar ponto, acompanhar banco de horas, ajustar relatórios e configurar sua jornada.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-border/80 bg-accent/35 px-3 py-3 text-sm text-muted-foreground">
          O tour usa exemplos de como fazer e não cria dados reais no sistema.
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onSkip}>
            Pular por enquanto
          </Button>
          <Button type="button" onClick={onStart}>
            <Play className="mr-2 h-4 w-4" />
            Começar tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HelpCenter({ open, onOpenChange, onStartTour }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Primeiros passos</DialogTitle>
          <DialogDescription>Reabra o tour, consulte atalhos e relembre termos importantes do sistema.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <HelpBlock icon={Play} title="Tour guiado">
            Reveja o passo a passo com destaque visual nas áreas de Ponto, Relatório e Configurações.
          </HelpBlock>
          <HelpBlock icon={Keyboard} title="Atalhos úteis">
            No tour, use setas esquerda e direita para navegar e Esc para sair. Na planilha, Enter abre o ajuste do dia.
          </HelpBlock>
          <HelpBlock icon={Lightbulb} title="FAQ rápido">
            Posso corrigir um ponto? Sim, abra Relatório e clique no dia. Como justifico ausência? Use Configurações, aba Justificar.
          </HelpBlock>
          <HelpBlock icon={LifeBuoy} title="Glossário e suporte">
            Banco de horas é o saldo entre jornada prevista e trabalhada. Suporte: fale com o responsável de RH ou administrador do sistema.
          </HelpBlock>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={onStartTour}>
            <Play className="mr-2 h-4 w-4" />
            Iniciar tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HelpBlock({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/75 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
        <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
