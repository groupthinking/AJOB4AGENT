import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/providers/SessionProvider'

export const metadata: Metadata = {
  title: 'AJOB4AGENT - Autonomous Job Application System',
  description: 'Monitor and manage automated job applications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}