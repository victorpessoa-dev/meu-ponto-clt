/**
 * Rota publica de login.
 */
import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthLoginRoute } from "@/components/auth/auth-login-route"

export const metadata = {
  title: "Login",
  description: "Entre no Meu Ponto CLT para registrar horários, importar planilhas e acompanhar sua jornada.",
}

/**
 * Monta o provider de auth e o guard especifico do login.
 */
export default function LoginPage() {
  return (
    <AuthProvider>
      <AuthLoginRoute />
    </AuthProvider>
  )
}
