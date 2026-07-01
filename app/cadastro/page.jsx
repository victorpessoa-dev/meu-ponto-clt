import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthRegisterRoute } from "@/components/auth/auth-register-route"

export const metadata = {
  title: "Cadastro",
  description: "Crie seu perfil profissional com avatar, empresa, função e controle de jornada.",
}

export default function CadastroPage() {
  return (
    <AuthProvider>
      <AuthRegisterRoute />
    </AuthProvider>
  )
}
