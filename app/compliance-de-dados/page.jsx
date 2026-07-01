import { LegalPage } from "@/components/legal/legal-page"
import { complianceSections } from "@/lib/legal/legal-content"

export const metadata = {
  title: "Compliance de Dados",
  description: "Checklist de governanca, seguranca e conformidade de dados para operacao do Meu Ponto CLT.",
}

export default function DataCompliancePage() {
  return (
    <LegalPage
      badge="Governanca"
      title="Compliance de Dados"
      description="Diretrizes praticas para manter inventario, bases legais, controles de acesso, retencao, operadores e atendimento aos titulares em ordem."
      notice="Use este guia como checklist interno. A conformidade real depende de contratos, processos, registros e decisoes do controlador responsavel pela operacao."
      sections={complianceSections}
    />
  )
}
