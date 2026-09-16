/**
 * Navigation component for authenticated pages
 */

import Link from 'next/link'
import React from 'react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Partners', href: '/partners' },
  { label: 'Distributors', href: '/distributors' },
  { label: 'Opportunities', href: '/opportunities' },
  { label: 'Matches', href: '/matches' },
]

export function AppNav() {
  return (
    <nav className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-xs font-black text-white">
            AI
          </span>
          <span className="text-sm font-semibold text-white">AI Distribution</span>
        </Link>

        {/* Primary nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <button className="rounded-md px-3 py-2 text-sm text-slate-300 hover:text-white">
            Settings
          </button>
          <button className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

/**
 * Mobile-friendly sidebar nav (for future implementation)
 */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 border-r border-slate-800 bg-slate-950 md:block">
      <nav className="space-y-2 p-5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
