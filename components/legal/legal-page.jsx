import Link from "next/link"
import { ArrowLeft, Clock, FileCheck2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { legalUpdatedAt } from "@/lib/legal/legal-content"

export function LegalPage({ badge, title, description, sections, notice }) {
  return (
    <main className="min-h-dvh bg-background pt-safe">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-safe py-3">
          <Link
            href="/login"
            className="touch-target inline-flex items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-primary">
            <Clock className="h-5 w-5 shrink-0" />
            <span className="truncate text-sm font-bold">Meu Ponto CLT</span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-safe py-8 sm:py-10">
        <section className="mb-6">
          <Badge variant="secondary" className="mb-4">
            <FileCheck2 className="h-3 w-3" />
            {badge}
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
          <p className="mt-3 text-sm text-muted-foreground">Ultima atualizacao: {legalUpdatedAt}</p>
        </section>

        {notice && (
          <Card className="mb-6 rounded-lg border-primary/20 bg-primary/5">
            <CardContent className="leading-6 text-primary">{notice}</CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-8 flex flex-wrap gap-3 border-t border-border pt-5 text-sm">
          <Link href="/privacidade" className="font-medium text-primary underline-offset-2 hover:underline">
            Politica de Privacidade
          </Link>
          <Link href="/termos-de-uso" className="font-medium text-primary underline-offset-2 hover:underline">
            Termos de Uso
          </Link>
          <Link href="/compliance-de-dados" className="font-medium text-primary underline-offset-2 hover:underline">
            Compliance de Dados
          </Link>
        </footer>
      </div>
    </main>
  )
}
