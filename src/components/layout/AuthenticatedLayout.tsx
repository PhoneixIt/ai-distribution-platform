/**
 * Layout wrapper for authenticated pages
 */

import React from 'react'
import { AppNav } from './AppNav'

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <AppNav />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
