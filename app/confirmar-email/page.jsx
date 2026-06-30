import { Suspense } from "react"
import { EmailConfirmationScreen } from "@/components/email-confirmation-screen"

export const metadata = {
  title: "Confirmar e-mail",
  description: "Confirme seu e-mail para ativar o cadastro no Meu Ponto CLT.",
}

export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailConfirmationScreen />
    </Suspense>
  )
}
