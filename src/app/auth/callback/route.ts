import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/app'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = safeNext(requestUrl.searchParams.get('next'))
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error || !code) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', errorDescription || error || 'Authentication could not be completed.')
    return NextResponse.redirect(loginUrl)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const loginUrl = new URL('/login', requestUrl.origin)
    loginUrl.searchParams.set('error', exchangeError.message)
    return NextResponse.redirect(loginUrl)
  }

  // Always finish OAuth inside the authenticated product, not on the marketing site.
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
