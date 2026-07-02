"use client"

/**
 * Tela exibida quando a PWA nao consegue carregar conteudo online.
 */
import Link from "next/link"
import { RefreshCw, WifiOff } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils/utils"

/**
 * Oferece acao de recarregar e retorno ao inicio durante falhas de conexao.
 */
export function OfflineScreen() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-primary px-safe py-8 pt-safe pb-safe sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary-foreground/25" />
      <div className="w-full max-w-sm animate-fade-slide text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 shadow-[0_16px_48px_rgba(0,0,0,0.12)] animate-float">
          <WifiOff className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-primary-foreground">Sem conexão</h1>
        <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
          Não conseguimos carregar esta página agora. Confira sua internet e tente novamente.
        </p>

        <div className="mt-6 rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-3 shadow-xl backdrop-blur">
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "mt-2 h-10 w-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  )
}
