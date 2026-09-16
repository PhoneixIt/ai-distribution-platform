import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const next = requestUrl.searchParams.get('next')

  if (error || !code) {
    const url = new URL('/login', requestUrl.origin)
    url.searchParams.set('error', errorDescription || error || 'Authentication could not be completed.')
    return NextResponse.redirect(url)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    const url = new URL('/login', requestUrl.origin)
    url.searchParams.set('error', exchangeError.message)
    return NextResponse.redirect(url)
  }

  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'
  const redirectUrl = new URL(safeNext, requestUrl.origin)
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
