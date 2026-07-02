/**
 * Rota de fallback offline usada pelo Service Worker.
 */
import { OfflineScreen } from "@/components/app/offline-screen"

export const metadata = {
  title: "Sem conexão",
}

/**
 * Exibe a tela de orientacao quando nao ha conexao.
 */
export default function OfflinePage() {
  return <OfflineScreen />
}
