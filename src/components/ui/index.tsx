import Link from 'next/link'
import React from 'react'

export function ButtonPrimary({ children, href, onClick, disabled = false, type = 'button', className = '' }: { children: React.ReactNode; href?: string; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' | 'reset'; className?: string }) {
  const classes = `inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`
  if (href) return <Link href={href} className={classes}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} className={classes}>{children}</button>
}

export function ButtonSecondary({ children, href, onClick, disabled = false, type = 'button', className = '' }: { children: React.ReactNode; href?: string; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' | 'reset'; className?: string }) {
  const classes = `inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${className}`
  if (href) return <Link href={href} className={classes}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} className={classes}>{children}</button>
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div> }
export function Badge({ children, variant = 'default', className = '' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error'; className?: string }) { const variants = { default: 'bg-slate-100 text-slate-700', success: 'bg-emerald-50 text-emerald-700', warning: 'bg-amber-50 text-amber-800', error: 'bg-red-50 text-red-700' }; return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}>{children}</span> }
export function LoadingSpinner() { return <div className="flex items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div> }
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) { return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center"><h3 className="text-lg font-semibold text-slate-900">{title}</h3>{description && <p className="mt-2 text-sm text-slate-600">{description}</p>}{action && <div className="mt-4">{action}</div>}</div> }
export function ErrorAlert({ message }: { message: string }) { return <div className="rounded-lg border border-red-200 bg-red-50 p-4"><p className="text-sm text-red-700">{message}</p></div> }
export function SuccessAlert({ message }: { message: string }) { return <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm text-emerald-700">{message}</p></div> }
