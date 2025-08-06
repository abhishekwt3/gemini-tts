import type { Metadata } from 'next'
import './globals.css'
import ClientWrapper from './components/ClientWrapper'

export const metadata: Metadata = {
  title: 'AI Text-to-Speech',
  description: 'Convert text to natural-sounding speech with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  )
}
