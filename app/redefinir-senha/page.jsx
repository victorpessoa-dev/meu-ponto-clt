/**
 * Rota de redefinicao de senha enviada pelo Supabase.
 */
import { Suspense } from "react"
import { PasswordResetScreen } from "@/components/auth/password-reset-screen"

export const metadata = {
  title: "Redefinir senha",
  description: "Crie uma nova senha de acesso ao Meu Ponto CLT.",
}

/**
 * Usa Suspense porque a tela le o codigo de recuperacao da URL no cliente.
 */
export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <PasswordResetScreen />
    </Suspense>
  )
}
