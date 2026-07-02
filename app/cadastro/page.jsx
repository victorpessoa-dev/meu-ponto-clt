/**
 * Rota publica de cadastro.
 */
import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthRegisterRoute } from "@/components/auth/auth-register-route"

export const metadata = {
  title: "Cadastro",
  description: "Crie seu perfil profissional com avatar, empresa, função e controle de jornada.",
}

/**
 * Monta o provider de auth e o guard especifico do cadastro.
 */
export default function CadastroPage() {
  return (
    <AuthProvider>
      <AuthRegisterRoute />
    </AuthProvider>
  )
}
