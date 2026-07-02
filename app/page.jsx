/**
 * Entrada principal autenticada do app.
 */
import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthenticatedAppRoute } from "@/components/auth/authenticated-app-route"

/**
 * Monta o provider de auth e o guard da aplicacao.
 */
export default function Page() {
  return (
    <AuthProvider>
      <AuthenticatedAppRoute />
    </AuthProvider>
  )
}
