import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { cn } from '@/lib/utils'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'AJOB4AGENT - AI Job Application Platform',
  description: 'Automated job applications powered by AI. Apply to hundreds of jobs with personalized resumes and cover letters.',
  keywords: ['AI', 'job application', 'automation', 'career', 'recruitment', 'resume'],
  authors: [{ name: 'AJOB4AGENT Team' }],
  openGraph: {
    title: 'AJOB4AGENT - AI Job Application Platform',
    description: 'Automated job applications powered by AI',
    type: 'website',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.variable
      )}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}