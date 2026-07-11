"use client"

/**
 * Campo de senha com alternancia de visibilidade.
 */
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"

/**
 * Encapsula input de senha para reutilizar acessibilidade e botao de exibir/ocultar.
 */
export function PasswordField({ id, value, onChange, autoComplete, placeholder = "********", ...props }) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="pr-12"
        {...props}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Ver senha"}
      >
        <Icon className="h-4 w-4" />
      </button>
    </div>
  )
}
