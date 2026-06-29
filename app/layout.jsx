import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  metadataBase: new URL('https://meu-ponto-clt.local'),
  title: {
    default: 'Meu Ponto CLT',
    template: '%s | Meu Ponto CLT',
  },
  description:
    'Registre horários de ponto, acompanhe banco de horas, importe planilhas XLSX e personalize seu perfil profissional.',
  applicationName: 'Meu Ponto CLT',
  keywords: ['ponto eletrônico', 'controle de jornada', 'CLT', 'banco de horas', 'planilha de ponto'],
  authors: [{ name: 'Meu Ponto CLT' }],
  creator: 'Meu Ponto CLT',
  publisher: 'Meu Ponto CLT',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Meu Ponto CLT',
    description:
      'Controle de jornada com perfil personalizado, importação XLSX, relatórios mensais e banco de horas.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Meu Ponto CLT',
  },
  twitter: {
    card: 'summary',
    title: 'Meu Ponto CLT',
    description: 'Controle de jornada, relatórios e banco de horas em uma experiência simples.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Meu Ponto CLT',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml', sizes: '512x512' },
    ],
    shortcut: '/favicon.svg',
    apple: [{ url: '/apple-icon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport = {
  colorScheme: 'light',
  themeColor: '#1a2b4a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegister />
        <Toaster position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
