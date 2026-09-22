import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { RelationshipGraph } from '@/components/relationships/RelationshipGraph'
import { getAuthenticatedServerClient } from '@/lib/supabase/server'
import { ensureWorkspace } from '@/lib/supabase/workspace'
import { listEcosystemRelationships } from '@/lib/supabase/services'

export const metadata = {
  title: 'Relationships | PortAi',
  description: 'Manage the PortAi ecosystem relationship graph',
}

export default async function RelationshipsPage() {
  const { supabase, user, error: authError } = await getAuthenticatedServerClient()
  let relationships = []
  let loadError = authError?.message || (!user ? 'Authentication required.' : '')

  if (user && !authError) {
    try {
      const { orgId } = await ensureWorkspace()
      relationships = await listEcosystemRelationships(supabase, orgId, { limit: 500 })
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Could not load relationships.'
    }
  }

  return (
    <AuthenticatedLayout>
      <RelationshipGraph initialRelationships={relationships} error={loadError || undefined} />
    </AuthenticatedLayout>
  )
}
