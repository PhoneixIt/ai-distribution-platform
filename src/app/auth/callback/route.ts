import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const oauthError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, requestUrl.origin))
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=Authentication%20callback%20did%20not%20include%20an%20authorization%20code.', requestUrl.origin),
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
  }

  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app'
  return NextResponse.redirect(new URL(safeNext, requestUrl.origin))
}
