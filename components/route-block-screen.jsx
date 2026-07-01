import Link from "next/link"
import { Clock, LockKeyhole, SearchX } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const COPY = {
  restricted: {
    icon: LockKeyhole,
    title: "Acesso restrito",
    description: "Entre com sua conta para acessar esta area do sistema.",
    primaryHref: "/login",
    primaryLabel: "Entrar",
    secondaryHref: "/cadastro",
    secondaryLabel: "Criar cadastro",
  },
  notFound: {
    icon: SearchX,
    title: "Pagina nao encontrada",
    description: "Esta rota nao existe ou nao esta disponivel neste projeto.",
    primaryHref: "/",
    primaryLabel: "Voltar para o inicio",
    secondaryHref: "/login",
    secondaryLabel: "Ir para login",
  },
}

export function RouteBlockScreen({ type = "restricted" }) {
  const copy = COPY[type] || COPY.restricted
  const Icon = copy.icon || Clock

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary-foreground/25" />
      <div className="w-full max-w-sm animate-fade-slide text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 shadow-[0_16px_48px_rgba(0,0,0,0.12)] animate-float">
          <Icon className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-primary-foreground">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-primary-foreground/75">{copy.description}</p>

        <div className="mt-6 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-3 shadow-xl backdrop-blur">
          <Link
            href={copy.primaryHref}
            className={cn(buttonVariants(), "h-11 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90")}
          >
            {copy.primaryLabel}
          </Link>
          <Link
            href={copy.secondaryHref}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mt-2 h-10 w-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            {copy.secondaryLabel}
          </Link>
        </div>
      </div>
    </main>
  )
}
