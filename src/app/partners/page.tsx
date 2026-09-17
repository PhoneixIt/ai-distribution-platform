import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { PartnerDirectory } from '@/components/partners/PartnerDirectory'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { getPartners } from '@/lib/supabase/services'

export const metadata = {
  title: 'Partners | AI Distribution Platform',
  description: 'Browse and manage channel partners in your directory',
}

export default async function PartnersPage() {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()

  if (authError || !user) {
    return (
      <AuthenticatedLayout>
        <PartnerDirectory error={authError?.message || 'Authentication required.'} />
      </AuthenticatedLayout>
    )
  }

  try {
    const partners = await getPartners(supabase, { limit: 500 })
    return (
      <AuthenticatedLayout>
        <PartnerDirectory initialPartners={partners} />
      </AuthenticatedLayout>
    )
  } catch (error) {
    return (
      <AuthenticatedLayout>
        <PartnerDirectory error={error instanceof Error ? error.message : 'Could not load partners.'} />
      </AuthenticatedLayout>
    )
  }
}
