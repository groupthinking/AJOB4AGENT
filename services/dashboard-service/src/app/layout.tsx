import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Job Application Dashboard',
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
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}