import { Highlight, Layout, Paragraph } from "./Layout"

export function Welcome({ name }) {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "Olá"

  return (
    <Layout preview="Sua conta no Meu Ponto CLT está pronta." eyebrow="Boas-vindas" title="Conta criada com sucesso">
      <Paragraph>Olá, {firstName}.</Paragraph>
      <Paragraph>
        Sua conta no Meu Ponto CLT foi criada com sucesso pela equipe Virtus Soft.
      </Paragraph>
      <Paragraph>
        Agora você já pode acessar o sistema para registrar sua jornada, acompanhar banco de horas e revisar seus
        relatórios.
      </Paragraph>
      <Highlight>Recomendamos conferir seus dados de perfil e sua jornada semanal antes dos primeiros registros.</Highlight>
    </Layout>
  )
}
