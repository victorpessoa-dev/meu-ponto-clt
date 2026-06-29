import { AuthLoginRoute } from "@/components/auth-login-route"

export const metadata = {
  title: "Login",
  description: "Entre no Meu Ponto CLT para registrar horários, importar planilhas e acompanhar sua jornada.",
}

export default function LoginPage() {
  return <AuthLoginRoute />
}
