import type { Metadata } from 'next'
import { AuthProvider } from '@/context/AuthContext'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Aditus - AI Career Workflow Agent',
  description: 'Automate your job applications for the Kenyan job market',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
