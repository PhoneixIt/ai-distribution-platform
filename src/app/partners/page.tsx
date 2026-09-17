import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { PartnerDirectory } from '@/components/partners/PartnerDirectory'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { getPartners } from '@/lib/supabase/services'
import type { PartnerRecord } from '@/lib/supabase/services'

export const metadata = {
  title: 'Partners | AI Distribution Platform',
  description: 'Browse and manage channel partners in your directory',
}

export default async function PartnersPage() {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  let partners: PartnerRecord[] = []
  let loadError = authError?.message || (!user ? 'Authentication required.' : '')

  if (user && !authError) {
    try {
      partners = await getPartners(supabase, { limit: 500 })
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Could not load partners.'
    }
  }

  return (
    <AuthenticatedLayout>
      <PartnerDirectory initialPartners={loadError ? [] : partners} error={loadError || undefined} />
    </AuthenticatedLayout>
  )
}
