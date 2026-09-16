import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { validateEnvironment } from '@/lib/env'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI Distribution Platform',
  description:
    'AI-powered vendor, distributor, partner and customer discovery and matching.',
}

type RootLayoutProps = Readonly<{ children: React.ReactNode }>

/**
 * Root layout
 * Validates environment on startup and sets up global styles
 */
export default function RootLayout({ children }: RootLayoutProps) {
  // Validate environment variables on startup
  try {
    validateEnvironment()
  } catch (error) {
    console.error('Environment validation failed:', error)
    // In development, allow to continue; in production, this should fail hard
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-950 text-white">
        {children}
      </body>
    </html>
  )
}
