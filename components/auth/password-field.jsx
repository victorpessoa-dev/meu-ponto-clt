"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
        className="pr-11"
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute right-1 top-1/2 -translate-y-1/2"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Ver senha"}
      >
        <Icon className="h-4 w-4" />
      </Button>
    </div>
  )
}
