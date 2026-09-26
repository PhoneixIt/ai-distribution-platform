import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options)
  })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error('[supabase-proxy] Missing Supabase public environment variables at runtime', {
      hasUrl: Boolean(supabaseUrl),
      hasPublishableKey: Boolean(supabasePublishableKey),
    })
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const pathname = request.nextUrl.pathname

  if (error) {
    console.error('[supabase-proxy] getClaims failed:', error.message)
  }

  const protectedPrefixes = ['/app', '/discovery', '/opportunities', '/missions', '/matches', '/workflow', '/partners', '/vendors', '/distributors', '/customers', '/settings', '/workforce', '/engagements', '/products']

  const isPublicEntryRoute = pathname === '/' || pathname === '/login' || pathname === '/signup'
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))

  // Authenticated users should be redirected away from public entry pages
  if (claims && !claims.is_anonymous && isPublicEntryRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    const redirectResponse = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  // Unauthenticated or anonymous users must be redirected to login for protected routes
  if ((!claims || claims.is_anonymous) && isProtectedRoute) {
    const next = request.nextUrl.pathname + request.nextUrl.search
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', next)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
