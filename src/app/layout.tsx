import { Providers } from './providers'
import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Doceria Pro — Gestão para Confeiteiras',
  description: 'Gerencie pedidos, produção, finanças e marketing da sua doceria em um só lugar.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
