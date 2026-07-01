import { AuthProvider } from "@/lib/auth/auth-context"
import { AuthenticatedAppRoute } from "@/components/auth/authenticated-app-route"

export default function Page() {
  return (
    <AuthProvider>
      <AuthenticatedAppRoute />
    </AuthProvider>
  )
}
