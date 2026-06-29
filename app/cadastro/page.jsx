import { AuthRegisterRoute } from "@/components/auth-register-route"

export const metadata = {
  title: "Cadastro",
  description: "Crie seu perfil profissional com avatar, empresa, função e controle de jornada.",
}

export default function CadastroPage() {
  return <AuthRegisterRoute />
}
