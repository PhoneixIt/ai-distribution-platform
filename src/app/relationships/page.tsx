'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/app-shell'
import { RelationshipGraph } from '@/components/relationships/RelationshipGraph'
import { ensureWorkspace } from '@/lib/supabase/workspace'
import { listEcosystemRelationships, type EcosystemRelationship } from '@/lib/supabase/services'

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<EcosystemRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    void (async () => {
      try {
        const { supabase, orgId } = await ensureWorkspace()
        const data = await listEcosystemRelationships(supabase, orgId, { limit: 500 })
        if (!mounted) return
        setRelationships(data)
      } catch (cause) {
        if (!mounted) return
        setError(cause instanceof Error ? cause.message : 'Could not load relationships.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <AppShell title="Relationships" subtitle="Connect organizations and ecosystem entities across their commercial lifecycle.">
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">
          Loading your ecosystem relationships…
        </div>
      ) : (
        <RelationshipGraph initialRelationships={relationships} error={error || undefined} />
      )}
    </AppShell>
  )
}
