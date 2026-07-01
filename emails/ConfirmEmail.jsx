import { Highlight, Layout, Paragraph } from "./Layout"

export function ConfirmEmail({ name, actionUrl }) {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "Olá"

  return (
    <Layout
      preview="Confirme seu e-mail para ativar sua conta no Meu Ponto CLT."
      eyebrow="Confirmação de cadastro"
      title="Ative sua conta"
      actionLabel="Confirmar e-mail"
      actionUrl={actionUrl}
      note="Por segurança, este link deve ser usado apenas por você. Se não foi você que criou a conta, ignore este e-mail."
    >
      <Paragraph>Olá, {firstName}.</Paragraph>
      <Paragraph>
        Recebemos seu cadastro no Meu Ponto CLT, o controle de jornada desenvolvido pela Virtus Soft.
      </Paragraph>
      <Paragraph>
        Para liberar seu acesso, confirme seu e-mail no botão abaixo. Depois da confirmação, você será enviado para a
        tela de login.
      </Paragraph>
      <Highlight>Com a conta ativa, você poderá registrar pontos, acompanhar banco de horas e consultar relatórios mensais.</Highlight>
    </Layout>
  )
}
