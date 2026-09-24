import AppShell from '@/components/app-shell'
import { PartnerDirectory } from '@/components/partners/PartnerDirectory'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { getPartners } from '@/lib/supabase/services'
import type { PartnerRecord } from '@/lib/supabase/services'

export const metadata = {
  title: 'Partners | PortAi',
  description: 'Find, review and manage channel partners in your PortAi ecosystem.',
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
    <AppShell
      title="Partners"
      subtitle="Find, review and grow the relationships that move technology to market."
    >
      <PartnerDirectory initialPartners={loadError ? [] : partners} error={loadError || undefined} />
    </AppShell>
  )
}
