import "server-only"
import { render } from "@react-email/render"
import { getEmailFrom } from "./auth-utils"
import { getResend } from "./resend"
import { ConfirmEmail } from "@/emails/ConfirmEmail"
import { ResetPassword } from "@/emails/ResetPassword"
import { Welcome } from "@/emails/Welcome"

const templates = {
  confirm: {
    subject: "Confirme seu e-mail | Meu Ponto CLT by Virtus Soft",
    component: ConfirmEmail,
  },
  reset: {
    subject: "Redefina sua senha | Meu Ponto CLT by Virtus Soft",
    component: ResetPassword,
  },
  welcome: {
    subject: "Bem-vindo ao Meu Ponto CLT | Virtus Soft",
    component: Welcome,
  },
}

/**
 * Renderiza o template React Email escolhido, cria uma versao texto simples e envia pelo Resend.
 * A funcao fica no servidor para manter a API key e o remetente fora do navegador.
 */
export async function sendEmail({ to, template, props }) {
  const config = templates[template]
  if (!config) return { error: new Error("Template de e-mail invalido.") }

  const resend = getResend()
  const Component = config.component
  const html = await render(<Component {...props} />)
  const text = buildTextFallback(template, props)

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to,
    subject: config.subject,
    html,
    text,
  })

  if (error) return { error }
  return { ok: true }
}

/**
 * Gera um fallback em texto puro para clientes de e-mail que nao exibem HTML.
 */
function buildTextFallback(template, props = {}) {
  if (template === "confirm") {
    return `Confirme seu e-mail no Meu Ponto CLT, desenvolvido pela Virtus Soft.\n\nAcesse: ${props.actionUrl}`
  }

  if (template === "reset") {
    return `Redefina sua senha do Meu Ponto CLT com seguranca.\n\nAcesse: ${props.actionUrl}`
  }

  return "Sua conta no Meu Ponto CLT esta pronta. Equipe Virtus Soft."
}
