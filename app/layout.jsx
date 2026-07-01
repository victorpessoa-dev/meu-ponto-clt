import { Analytics } from '@vercel/analytics/next'
import { Manrope } from 'next/font/google'
import './globals.css'
import { OpeningSplash } from '@/components/splash-screen'
import { ConnectionStatus } from '@/components/connection-status'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  weight: ['500', '600', '700'],
})

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
  authors: [{ name: 'Virtus Soft' }],
  creator: 'Virtus Soft',
  publisher: 'Virtus Soft',
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
  colorScheme: 'light dark',
  themeColor: '#1a2b4a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="bg-background" suppressHydrationWarning>
      <body className={`${manrope.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <OpeningSplash />
          <ServiceWorkerRegister />
          <Toaster position="top-center" />
          <ConnectionStatus />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
