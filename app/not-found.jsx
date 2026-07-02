/**
 * Rota padrao para paginas nao encontradas.
 */
import { RouteBlockScreen } from "@/components/app/route-block-screen"

/**
 * Reutiliza a tela de bloqueio com mensagem de 404.
 */
export default function NotFound() {
  return <RouteBlockScreen type="notFound" />
}
