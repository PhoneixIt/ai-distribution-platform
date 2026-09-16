import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options)
  })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  if (claims && !claims.is_anonymous && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    const redirectResponse = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  if (!claims && pathname.startsWith('/app')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'Please sign in to access your workspace.')
    const redirectResponse = NextResponse.redirect(url)
    copyCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  return supabaseResponse
}
