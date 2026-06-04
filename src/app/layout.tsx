import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PHCL Super - Cryptocurrency Trading Platform',
  description: 'Trade Bitcoin, Ethereum, Pi Network and more.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
