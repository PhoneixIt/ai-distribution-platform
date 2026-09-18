import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
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
 * Provides global styles and application metadata.
 *
 * Environment validation belongs at the runtime boundary where the relevant
 * service is used. Running it here makes a production build depend on local
 * or CI-only secrets/public environment configuration.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-950 text-white">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
