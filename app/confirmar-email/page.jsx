/**
 * Rota de confirmacao de e-mail enviada pelo Supabase.
 */
import { Suspense } from "react"
import { EmailConfirmationScreen } from "@/components/auth/email-confirmation-screen"

export const metadata = {
  title: "Confirmar e-mail",
  description: "Confirme seu e-mail para ativar o cadastro no Meu Ponto CLT.",
}

/**
 * Usa Suspense porque a tela le parametros da URL no cliente.
 */
export default function ConfirmarEmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailConfirmationScreen />
    </Suspense>
  )
}
