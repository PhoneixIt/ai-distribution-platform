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

  // Keep the marketing/auth pages from being shown to an already-authenticated
  // visitor, but do not server-redirect protected workspace routes. OAuth is
  // completed in the browser and the workspace shell validates that same browser
  // session; duplicating that decision here can create a redirect loop immediately
  // after the PKCE code exchange.
  if (claims && !claims.is_anonymous && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    const redirectResponse = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  return supabaseResponse
}
