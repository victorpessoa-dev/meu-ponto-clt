import Link from "next/link"
import { Clock } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary px-safe py-10 text-primary-foreground">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-sm text-primary-foreground/75">Esta rota não existe neste projeto.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary-foreground px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-foreground/90"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}
