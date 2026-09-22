import { createBrowserClient } from '@supabase/ssr'

function getSupabasePublicKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, getSupabasePublicKey())
}

export async function getAuthenticatedClient() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || user.is_anonymous) return { supabase, error: error || new Error('Please sign in to continue.') }
  return { supabase, error: null }
}
