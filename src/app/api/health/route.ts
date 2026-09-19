import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks = {
    app: true,
    supabase_configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    discovery_provider_configured: Boolean(process.env.EXA_API_KEY || process.env.FIRECRAWL_API_KEY),
  }

  const ok = checks.app && checks.supabase_configured

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
