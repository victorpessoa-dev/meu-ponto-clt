import { AuthProvider } from "@/lib/auth-context"
import { AuthenticatedAppRoute } from "@/components/authenticated-app-route"

export default function Page() {
  return (
    <AuthProvider>
      <AuthenticatedAppRoute />
    </AuthProvider>
  )
}
