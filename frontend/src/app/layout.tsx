import type { Metadata } from 'next'
import { AuthProvider } from '@/context/AuthContext'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Le-AI',
  description: 'Automate your job applications for the Kenyan job market',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" sizes="any" />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
