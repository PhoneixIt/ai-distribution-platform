/**
 * Reusable UI components for the platform
 */

import Link from 'next/link'
import React from 'react'

/**
 * Primary button component
 */
export function ButtonPrimary({
  children,
  href,
  onClick,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  const classes = `inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}

/**
 * Secondary button component
 */
export function ButtonSecondary({
  children,
  href,
  onClick,
  disabled = false,
  className = '',
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  const classes = `inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed ${className}`

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}

/**
 * Card component for content grouping
 */
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900/50 p-5 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Badge component for labels and tags
 */
export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}) {
  const variants = {
    default: 'bg-slate-800 text-slate-300',
    success: 'bg-emerald-950 text-emerald-300',
    warning: 'bg-yellow-950 text-yellow-300',
    error: 'bg-red-950 text-red-300',
  }

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

/**
 * Loading state placeholder
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
    </div>
  )
}

/**
 * Empty state component
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Error alert component
 */
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
      <p className="text-sm text-red-300">{message}</p>
    </div>
  )
}

/**
 * Success alert component
 */
export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4">
      <p className="text-sm text-emerald-300">{message}</p>
    </div>
  )
}
