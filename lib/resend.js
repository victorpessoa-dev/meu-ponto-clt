import "server-only"
import { Resend } from "resend"

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Configure RESEND_API_KEY no ambiente do servidor.")
  }

  return new Resend(process.env.RESEND_API_KEY)
}
