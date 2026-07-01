import { Highlight, Layout, Paragraph } from "./Layout"

export function ResetPassword({ name, actionUrl }) {
  const firstName = String(name || "").trim().split(/\s+/)[0] || "Olá"

  return (
    <Layout
      preview="Redefina sua senha do Meu Ponto CLT com segurança."
      eyebrow="Recuperação de acesso"
      title="Redefina sua senha"
      actionLabel="Criar nova senha"
      actionUrl={actionUrl}
      note="Se você não solicitou essa redefinição, ignore este e-mail. Sua senha atual continuará válida."
    >
      <Paragraph>Olá, {firstName}.</Paragraph>
      <Paragraph>
        Recebemos uma solicitação para redefinir a senha da sua conta no Meu Ponto CLT.
      </Paragraph>
      <Paragraph>
        Use o botão abaixo para abrir uma página segura e cadastrar uma nova senha de acesso.
      </Paragraph>
      <Highlight>Para sua proteção, escolha uma senha forte e não compartilhe este link com outras pessoas.</Highlight>
    </Layout>
  )
}
