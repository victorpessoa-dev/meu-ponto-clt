import { LegalPage } from "@/components/legal-page"
import { privacySections } from "@/lib/legal-content"

export const metadata = {
  title: "Politica de Privacidade",
  description: "Politica de Privacidade e tratamento de dados pessoais do Meu Ponto CLT conforme a LGPD.",
}

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="LGPD"
      title="Politica de Privacidade"
      description="Como o Meu Ponto CLT coleta, usa, compartilha, protege e retem dados pessoais ligados a conta, perfil profissional, jornada e justificativas."
      notice="Este texto e uma base operacional de privacidade e deve ser revisado e completado com os dados do controlador, canal do encarregado e prazos internos antes da publicacao definitiva."
      sections={privacySections}
    />
  )
}
