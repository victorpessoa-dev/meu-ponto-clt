"use client"

import { useState } from "react"
import {
  BriefcaseBusiness,
  Calculator,
  Clock,
  Coffee,
  Code2,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Landmark,
  Laptop,
  Megaphone,
  PackageCheck,
  PenTool,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Truck,
  UserRound,
  Wrench,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const AVATAR_OPTIONS = [
  { key: "user", label: "Geral", icon: UserRound, tone: "bg-primary/12 text-primary ring-primary/20" },
  { key: "briefcase", label: "Administrativo", icon: BriefcaseBusiness, tone: "bg-positive/12 text-positive ring-positive/20" },
  { key: "laptop", label: "Tecnologia", icon: Laptop, tone: "bg-accent text-accent-foreground ring-accent-foreground/15" },
  { key: "code", label: "Desenvolvimento", icon: Code2, tone: "bg-primary text-primary-foreground ring-primary/20" },
  { key: "finance", label: "Financeiro", icon: Calculator, tone: "bg-positive text-positive-foreground ring-positive/20" },
  { key: "sales", label: "Vendas", icon: ShoppingCart, tone: "bg-negative/10 text-negative ring-negative/20" },
  { key: "marketing", label: "Marketing", icon: Megaphone, tone: "bg-accent text-accent-foreground ring-accent-foreground/15" },
  { key: "support", label: "Suporte", icon: Headphones, tone: "bg-secondary text-secondary-foreground ring-secondary-foreground/15" },
  { key: "logistics", label: "Logística", icon: Truck, tone: "bg-muted text-muted-foreground ring-border" },
  { key: "operations", label: "Operações", icon: PackageCheck, tone: "bg-positive/12 text-positive ring-positive/20" },
  { key: "maintenance", label: "Manutenção", icon: Wrench, tone: "bg-secondary text-secondary-foreground ring-secondary-foreground/15" },
  { key: "health", label: "Saúde", icon: Stethoscope, tone: "bg-negative/10 text-negative ring-negative/20" },
  { key: "education", label: "Treinamento", icon: GraduationCap, tone: "bg-primary/12 text-primary ring-primary/20" },
  { key: "legal", label: "Jurídico", icon: Landmark, tone: "bg-muted text-muted-foreground ring-border" },
  { key: "design", label: "Design", icon: PenTool, tone: "bg-accent text-accent-foreground ring-accent-foreground/15" },
  { key: "shield", label: "Segurança", icon: ShieldCheck, tone: "bg-secondary text-secondary-foreground ring-secondary-foreground/15" },
  { key: "handshake", label: "RH / Pessoas", icon: HeartHandshake, tone: "bg-positive/12 text-positive ring-positive/20" },
  { key: "clock", label: "Pontualidade", icon: Clock, tone: "bg-primary text-primary-foreground ring-primary/20" },
  { key: "coffee", label: "Atendimento", icon: Coffee, tone: "bg-muted text-muted-foreground ring-border" },
  { key: "sparkles", label: "Liderança", icon: Sparkles, tone: "bg-positive text-positive-foreground ring-positive/20" },
]

export function getAvatarOption(key) {
  return AVATAR_OPTIONS.find((option) => option.key === key) ?? AVATAR_OPTIONS[0]
}

export function UserAvatar({ avatarIcon, name, className, iconClassName }) {
  const option = getAvatarOption(avatarIcon)
  const Icon = option.icon

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground ring-1 ring-border transition-transform duration-300",
        className,
      )}
      aria-hidden="true"
      title={name}
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </span>
  )
}

export function AvatarPicker({ value, onChange, label = "Escolha um avatar" }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="touch-target inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        aria-expanded={open}
      >
        {open ? "Ocultar avatares" : label}
      </button>

      {open && (
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={label}>
          {AVATAR_OPTIONS.map((option) => {
            const Icon = option.icon
            const active = value === option.key

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  onChange(option.key)
                  setOpen(false)
                }}
                className={cn(
                  "group flex aspect-square items-center justify-center rounded-lg bg-card text-muted-foreground ring-1 ring-border transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground hover:shadow-sm",
                  active && "scale-[1.03] bg-primary text-primary-foreground ring-2 ring-primary",
                )}
                aria-label={option.label}
                aria-checked={active}
                role="radio"
                title={option.label}
              >
                <Icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
