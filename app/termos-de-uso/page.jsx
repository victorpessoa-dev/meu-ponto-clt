import { LegalPage } from "@/components/legal-page"
import { termsSections } from "@/lib/legal-content"

export const metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso do Meu Ponto CLT para registro de jornada, perfis e relatorios.",
}

export default function TermsPage() {
  return (
    <LegalPage
      badge="Uso do sistema"
      title="Termos de Uso"
      description="Condicoes para acesso, cadastro, administracao de usuarios, registro de ponto, relatorios e responsabilidades no uso do Meu Ponto CLT."
      notice="Estes Termos sao um modelo inicial para o produto e nao substituem revisao juridica adequada ao controlador, ao contrato de trabalho e ao contexto de uso."
      sections={termsSections}
    />
  )
}
